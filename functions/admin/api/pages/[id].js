import { json, requireAdmin, clean, slugify, logAdmin } from "../_auth.js";

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

export async function onRequestPut(context){
  const a=requireAdmin(context); if(!a.ok)return a.response;
  let b={}; try{b=await context.request.json()}catch{return json({ok:false,message:"JSON inválido"},400)}
  const id=context.params.id,now=new Date().toISOString(),title=clean(b.title,240);
  if(!title) return json({ok:false,message:"Título obrigatório"},400);
  const pageType=normalizePageType(b.pageType);
  const productIds=normalizeProductIds(b.productIds);
  const measures=normalizeMeasures(b.measures);
  await context.env.DB.prepare(`
    UPDATE pages SET title=?1,slug=?2,content_html=?3,seo_title=?4,seo_description=?5,
      active=?6,page_type=?7,product_ids_json=?8,hero_image_url=?9,measures_json=?10,custom_measure_url=?11,
      nav_group=?12,nav_order=?13,updated_at=?14
    WHERE id=?15 AND store_id='salvatex'
  `).bind(
    title,slugify(b.slug||title),clean(b.contentHtml,50000),clean(b.seoTitle,240),clean(b.seoDescription,500),
    b.active===false?0:1,pageType,JSON.stringify(productIds),clean(b.heroImageUrl,1000)||null,JSON.stringify(measures),clean(b.customMeasureUrl,1000)||null,
    ['cortinas_sob_medida','persianas_sob_medida','pronta_entrega','oculto'].includes(b.navGroup)?b.navGroup:'oculto',
    Number.isFinite(Number(b.navOrder))?Math.round(Number(b.navOrder)):100,
    now,id
  ).run();
  await logAdmin(context.env.DB,"page_updated","page",id,{title,pageType,productCount:productIds.length,measureCount:measures.length});
  return json({ok:true});
}

export async function onRequestDelete(context){
  const a=requireAdmin(context); if(!a.ok)return a.response;
  const id=context.params.id;
  await context.env.DB.prepare(`DELETE FROM pages WHERE id=?1 AND store_id='salvatex'`).bind(id).run();
  await logAdmin(context.env.DB,"page_deleted","page",id);
  return json({ok:true});
}
