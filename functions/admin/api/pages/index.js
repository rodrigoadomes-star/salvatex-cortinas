import { json, requireAdmin, clean, slugify, logAdmin } from "../_auth.js";

function normalizeProductIds(value){
  if(!Array.isArray(value)) return [];
  return [...new Set(value.map(v=>clean(v,160)).filter(Boolean))].slice(0,100);
}

export async function onRequestGet(context){
  const a=requireAdmin(context); if(!a.ok)return a.response;
  const rows=await context.env.DB.prepare(`SELECT * FROM pages WHERE store_id='salvatex' ORDER BY updated_at DESC`).all();
  return json({ok:true,pages:rows.results||[]});
}

export async function onRequestPost(context){
  const a=requireAdmin(context); if(!a.ok)return a.response;
  let b={}; try{b=await context.request.json()}catch{return json({ok:false,message:"JSON inválido"},400)}
  const id=crypto.randomUUID(), now=new Date().toISOString(), title=clean(b.title,240);
  if(!title) return json({ok:false,message:"Título obrigatório"},400);
  const pageType=b.pageType==='produtos'?'produtos':'conteudo';
  const productIds=normalizeProductIds(b.productIds);
  await context.env.DB.prepare(`
    INSERT INTO pages(
      id,store_id,title,slug,content_html,seo_title,seo_description,active,
      page_type,product_ids_json,hero_image_url,created_at,updated_at
    ) VALUES(?1,'salvatex',?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?11)
  `).bind(
    id,title,slugify(b.slug||title),clean(b.contentHtml,50000),clean(b.seoTitle,240),
    clean(b.seoDescription,500),b.active===false?0:1,pageType,JSON.stringify(productIds),
    clean(b.heroImageUrl,1000)||null,now
  ).run();
  await logAdmin(context.env.DB,"page_created","page",id,{title,pageType,productCount:productIds.length});
  return json({ok:true,id},201);
}
