import { json } from "../_lib.js";
import { requirePublicStore } from "../_tenant.js";

function parseJSON(value,fallback){try{return value?JSON.parse(value):fallback}catch{return fallback}}
function productPublic(row){return {id:row.id,categoryId:row.category_id,categoryName:row.category_name||"",categorySlug:row.category_slug||"",name:row.name,slug:row.slug,sku:row.sku||"",productType:row.product_type,saleType:row.sale_type,configurator:row.configurator||"",description:row.description||"",basePriceCents:Number(row.base_price_cents||0),comparePriceCents:row.compare_price_cents==null?null:Number(row.compare_price_cents),stock:row.stock==null?null:Number(row.stock),trackStock:Boolean(row.track_stock),featured:Boolean(row.featured),imageUrl:row.image_url||"",images:parseJSON(row.images_json,[]),options:parseJSON(row.options_json,{}),metadata:parseJSON(row.metadata_json,{})}}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:"Banco indisponível"},503);
  const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;const storeId=tenant.storeId;
  const url=new URL(context.request.url),category=String(url.searchParams.get("categoria")||"").trim(),featured=url.searchParams.get("destaques")==="1";
  try{
    const categoriesResult=await context.env.DB.prepare(`SELECT c.id,c.name,c.slug,c.description,c.sort_order,COUNT(p.id) product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.store_id=c.store_id AND p.active=1 WHERE c.store_id=?1 AND c.active=1 GROUP BY c.id ORDER BY c.sort_order ASC,c.name ASC`).bind(storeId).all();
    let sql=`SELECT p.*,c.name category_name,c.slug category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id AND c.store_id=p.store_id WHERE p.store_id=?1 AND p.active=1`,binds=[storeId];
    if(category){binds.push(category);sql+=` AND c.slug=?${binds.length}`;}if(featured)sql+=` AND p.featured=1`;sql+=` ORDER BY p.featured DESC,p.updated_at DESC,p.name ASC`;
    const productsResult=await context.env.DB.prepare(sql).bind(...binds).all();
    return json({ok:true,categories:(categoriesResult.results||[]).map(c=>({id:c.id,name:c.name,slug:c.slug,description:c.description||"",sortOrder:Number(c.sort_order||0),productCount:Number(c.product_count||0)})),products:(productsResult.results||[]).map(productPublic)});
  }catch(error){console.error("catalog public error",error);return json({ok:false,message:"Não foi possível carregar o catálogo"},500)}
}
