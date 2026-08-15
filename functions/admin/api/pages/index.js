import { json, requireAdmin, clean, sanitizeHtml, slugify, logAdmin } from "../_auth.js";

const PAGE_TYPES=new Set([
  'conteudo',
  'produtos',
  'configurador_wave',
  'configurador_prega_macho',
  'configurador_ilhos',
  'configurador_persiana'
]);

function normalizePageType(value){
  const type=String(value||'conteudo').trim();
  return PAGE_TYPES.has(type)?type:'conteudo';
}

function normalizeProductIds(value){
  if(!Array.isArray(value)) return [];
  return [...new Set(value.map(v=>clean(v,160)).filter(Boolean))].slice(0,100);
}

function normalizeMeasures(value){
  if(!Array.isArray(value)) return [];
  return value.slice(0,30).map((m,index)=>({
    id:clean(m?.id,80)||`medida-${index+1}`,
    label:clean(m?.label,160),
    value:clean(m?.value,80),
    productIds:normalizeProductIds(m?.productIds)
  })).filter(m=>m.label);
}

export async function onRequestGet(context){
  const a=await requireAdmin(context); if(!a.ok)return a.response;
  const rows=await context.env.DB.prepare(`SELECT * FROM pages WHERE store_id='salvatex' ORDER BY updated_at DESC`).all();
  return json({ok:true,pages:rows.results||[]});
}

export async function onRequestPost(context){
  const a=await requireAdmin(context); if(!a.ok)return a.response;
  let b={}; try{b=await context.request.json()}catch{return json({ok:false,message:"JSON inválido"},400)}
  const id=crypto.randomUUID(), now=new Date().toISOString(), title=clean(b.title,240);
  if(!title) return json({ok:false,message:"Título obrigatório"},400);
  const pageType=normalizePageType(b.pageType);
  const productIds=normalizeProductIds(b.productIds);
  const measures=normalizeMeasures(b.measures);
  await context.env.DB.prepare(`
    INSERT INTO pages(
      id,store_id,title,slug,content_html,seo_title,seo_description,active,
      page_type,product_ids_json,hero_image_url,measures_json,custom_measure_url,
      nav_group,nav_order,created_at,updated_at
    ) VALUES(?1,'salvatex',?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?15)
  `).bind(
    id,title,slugify(b.slug||title),sanitizeHtml(b.contentHtml),clean(b.seoTitle,240),
    clean(b.seoDescription,500),b.active===false?0:1,pageType,JSON.stringify(productIds),
    clean(b.heroImageUrl,1000)||null,JSON.stringify(measures),clean(b.customMeasureUrl,1000)||null,
    ['cortinas_sob_medida','persianas_sob_medida','pronta_entrega','oculto'].includes(b.navGroup)?b.navGroup:'oculto',
    Number.isFinite(Number(b.navOrder))?Math.round(Number(b.navOrder)):100,
    now
  ).run();
  await logAdmin(context.env.DB,"page_created","page",id,{title,pageType,productCount:productIds.length,measureCount:measures.length});
  return json({ok:true,id},201);
}
