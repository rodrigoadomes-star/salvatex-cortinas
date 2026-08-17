import { json, clean, slugify, cents, logAdmin } from "../../_auth.js";
import { requireAdminPermission } from "../../_permissions.js";
import { normalizeProductImages, validateProductMediaUrl } from "./_media.js";

function parseJson(value,fallback){try{return value?JSON.parse(value):fallback}catch{return fallback}}

export async function onRequestPut(context){
  const a=await requireAdminPermission(context,"company.products.write");if(!a.ok)return a.response;
  let b={};try{b=await context.request.json()}catch{return json({ok:false},400)}
  const id=context.params.id;
  const current=await context.env.DB.prepare(`SELECT * FROM products WHERE id=?1 AND store_id=?2 LIMIT 1`).bind(id,a.storeId).first();
  if(!current)return json({ok:false,message:"Produto não encontrado."},404);
  const name=clean(b.name??current.name,240);if(!name)return json({ok:false,message:"Nome obrigatório."},422);
  const currentImages=parseJson(current.images_json,[]);
  const main=validateProductMediaUrl(b.imageUrl===undefined?current.image_url:b.imageUrl,a);if(!main.ok)return json({ok:false,message:main.message},422);
  const gallery=normalizeProductImages(b.images===undefined?currentImages:b.images,a);if(!gallery.ok)return json({ok:false,message:gallery.message},422);
  const images=[...gallery.images];if(main.url&&!images.includes(main.url))images.unshift(main.url);
  const now=new Date().toISOString();
  const result=await context.env.DB.prepare(`UPDATE products SET category_id=?1,name=?2,slug=?3,sku=?4,product_type=?5,sale_type=?6,configurator=?7,description=?8,base_price_cents=?9,stock=?10,track_stock=?11,active=?12,featured=?13,image_url=?14,images_json=?15,options_json=?16,metadata_json=?17,updated_at=?18 WHERE id=?19 AND store_id=?20`).bind(
    b.categoryId===undefined?current.category_id:(b.categoryId||null),name,slugify(b.slug||current.slug||name),clean(b.sku===undefined?current.sku:b.sku,120),clean(b.productType||current.product_type||"pronta_entrega",80),clean(b.saleType||current.sale_type||"pronta_entrega",80),clean(b.configurator===undefined?current.configurator:b.configurator,120)||null,clean(b.description===undefined?current.description:b.description,5000),b.basePrice===undefined?Number(current.base_price_cents||0):cents(b.basePrice),b.stock===undefined?current.stock:(b.stock===""||b.stock==null?null:Number(b.stock)),b.trackStock===undefined?Number(current.track_stock||0):(b.trackStock?1:0),b.active===undefined?Number(current.active||0):(b.active===false?0:1),b.featured===undefined?Number(current.featured||0):(b.featured?1:0),main.url||images[0]||null,JSON.stringify(images),JSON.stringify(b.options===undefined?parseJson(current.options_json,{}):(b.options||{})),JSON.stringify(b.metadata===undefined?parseJson(current.metadata_json,{}):(b.metadata||{})),now,id,a.storeId).run();
  if(!result.meta?.changes)return json({ok:false,message:"Produto não encontrado."},404);
  await logAdmin(context.env.DB,"product_updated","product",id,{name,active:b.active!==false,imageCount:images.length},a.storeId);
  return json({ok:true,imageCount:images.length});
}

export async function onRequestDelete(context){
  const a=await requireAdminPermission(context,"company.products.delete");if(!a.ok)return a.response;
  const id=context.params.id,now=new Date().toISOString();
  const result=await context.env.DB.prepare(`UPDATE products SET active=0,updated_at=?1 WHERE id=?2 AND store_id=?3`).bind(now,id,a.storeId).run();
  if(!result.meta?.changes)return json({ok:false,message:"Produto não encontrado."},404);
  await logAdmin(context.env.DB,"product_soft_deleted","product",id,{active:false},a.storeId);
  return json({ok:true,softDeleted:true});
}
