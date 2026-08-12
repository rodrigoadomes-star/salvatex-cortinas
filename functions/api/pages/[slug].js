import { json } from "../_lib.js";

function parseJSON(value,fallback){try{return value?JSON.parse(value):fallback}catch{return fallback}}
function productPublic(row){return {
  id:row.id, categoryId:row.category_id, categoryName:row.category_name||"", categorySlug:row.category_slug||"",
  name:row.name, slug:row.slug, sku:row.sku||"", productType:row.product_type, saleType:row.sale_type,
  configurator:row.configurator||"", description:row.description||"", basePriceCents:Number(row.base_price_cents||0),
  comparePriceCents:row.compare_price_cents==null?null:Number(row.compare_price_cents), stock:row.stock==null?null:Number(row.stock),
  trackStock:Boolean(row.track_stock), featured:Boolean(row.featured), imageUrl:row.image_url||"",
  images:parseJSON(row.images_json,[]), options:parseJSON(row.options_json,{}), metadata:parseJSON(row.metadata_json,{})
}}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:"Banco indisponível"},503);
  const slug=String(context.params.slug||"").trim();
  if(!slug)return json({ok:false,message:"Página não informada"},400);
  try{
    const page=await context.env.DB.prepare(`SELECT * FROM pages WHERE store_id='salvatex' AND slug=?1 AND active=1 LIMIT 1`).bind(slug).first();
    if(!page)return json({ok:false,message:"Página não encontrada"},404);
    const ids=parseJSON(page.product_ids_json,[]).filter(Boolean).slice(0,100);
    let products=[];
    if(page.page_type==='produtos' && ids.length){
      const placeholders=ids.map((_,i)=>`?${i+1}`).join(',');
      const result=await context.env.DB.prepare(`
        SELECT p.*, c.name category_name, c.slug category_slug
        FROM products p LEFT JOIN categories c ON c.id=p.category_id
        WHERE p.store_id='salvatex' AND p.active=1 AND p.id IN (${placeholders})
      `).bind(...ids).all();
      const byId=new Map((result.results||[]).map(x=>[x.id,x]));
      products=ids.map(id=>byId.get(id)).filter(Boolean).map(productPublic);
    }
    const measures=parseJSON(page.measures_json,[]).map(m=>({
      id:String(m?.id||''),label:String(m?.label||''),value:String(m?.value||''),
      productIds:Array.isArray(m?.productIds)?m.productIds.map(String):[]
    })).filter(m=>m.label);
    return json({ok:true,page:{
      id:page.id,title:page.title,slug:page.slug,pageType:page.page_type||'conteudo',contentHtml:page.content_html||'',
      seoTitle:page.seo_title||'',seoDescription:page.seo_description||'',heroImageUrl:page.hero_image_url||'',
      measures,customMeasureUrl:page.custom_measure_url||''
    },products});
  }catch(error){console.error('public page error',error);return json({ok:false,message:"Não foi possível carregar a página"},500)}
}
