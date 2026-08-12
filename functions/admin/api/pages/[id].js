import { json, requireAdmin, clean, slugify, logAdmin } from "../_auth.js";

function normalizeProductIds(value){
  if(!Array.isArray(value)) return [];
  return [...new Set(value.map(v=>clean(v,160)).filter(Boolean))].slice(0,100);
}

export async function onRequestPut(context){
  const a=requireAdmin(context); if(!a.ok)return a.response;
  let b={}; try{b=await context.request.json()}catch{return json({ok:false,message:"JSON inválido"},400)}
  const id=context.params.id,now=new Date().toISOString(),title=clean(b.title,240);
  if(!title) return json({ok:false,message:"Título obrigatório"},400);
  const pageType=b.pageType==='produtos'?'produtos':'conteudo';
  const productIds=normalizeProductIds(b.productIds);
  await context.env.DB.prepare(`
    UPDATE pages SET title=?1,slug=?2,content_html=?3,seo_title=?4,seo_description=?5,
      active=?6,page_type=?7,product_ids_json=?8,hero_image_url=?9,updated_at=?10
    WHERE id=?11 AND store_id='salvatex'
  `).bind(
    title,slugify(b.slug||title),clean(b.contentHtml,50000),clean(b.seoTitle,240),clean(b.seoDescription,500),
    b.active===false?0:1,pageType,JSON.stringify(productIds),clean(b.heroImageUrl,1000)||null,now,id
  ).run();
  await logAdmin(context.env.DB,"page_updated","page",id,{title,pageType,productCount:productIds.length});
  return json({ok:true});
}

export async function onRequestDelete(context){
  const a=requireAdmin(context); if(!a.ok)return a.response;
  const id=context.params.id;
  await context.env.DB.prepare(`DELETE FROM pages WHERE id=?1 AND store_id='salvatex'`).bind(id).run();
  await logAdmin(context.env.DB,"page_deleted","page",id);
  return json({ok:true});
}
