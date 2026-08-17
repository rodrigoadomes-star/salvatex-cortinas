import { json, clean, slugify, cents, logAdmin } from "../../_auth.js";
import { requireAdminPermission } from "../../_permissions.js";

export async function onRequestPut(context){
  const a=await requireAdminPermission(context,"company.products.write");if(!a.ok)return a.response;
  let b={};try{b=await context.request.json()}catch{return json({ok:false},400)}
  const id=context.params.id,name=clean(b.name,240),now=new Date().toISOString();
  const result=await context.env.DB.prepare(`UPDATE products SET category_id=?1,name=?2,slug=?3,sku=?4,product_type=?5,sale_type=?6,configurator=?7,description=?8,base_price_cents=?9,stock=?10,track_stock=?11,active=?12,featured=?13,image_url=?14,updated_at=?15 WHERE id=?16 AND store_id=?17`).bind(b.categoryId||null,name,slugify(b.slug||name),clean(b.sku,120),clean(b.productType||"pronta_entrega",80),clean(b.saleType||"pronta_entrega",80),clean(b.configurator,120)||null,clean(b.description,5000),cents(b.basePrice),b.stock===""||b.stock==null?null:Number(b.stock),b.trackStock?1:0,b.active===false?0:1,b.featured?1:0,clean(b.imageUrl,1000)||null,now,id,a.storeId).run();
  if(!result.meta?.changes)return json({ok:false,message:"Produto não encontrado."},404);
  await logAdmin(context.env.DB,"product_updated","product",id,{name,active:b.active!==false},a.storeId);
  return json({ok:true});
}

export async function onRequestDelete(context){
  const a=await requireAdminPermission(context,"company.products.delete");if(!a.ok)return a.response;
  const id=context.params.id,now=new Date().toISOString();
  const result=await context.env.DB.prepare(`UPDATE products SET active=0,updated_at=?1 WHERE id=?2 AND store_id=?3`).bind(now,id,a.storeId).run();
  if(!result.meta?.changes)return json({ok:false,message:"Produto não encontrado."},404);
  await logAdmin(context.env.DB,"product_soft_deleted","product",id,{active:false},a.storeId);
  return json({ok:true,softDeleted:true});
}
