import { json, clean, slugify, logAdmin } from "../../_auth.js";
import { requireAdminPermission } from "../../_permissions.js";

export async function onRequestGet(context){
  const a=await requireAdminPermission(context,"company.products.write");if(!a.ok)return a.response;
  const rows=await context.env.DB.prepare(`SELECT c.*, COUNT(p.id) product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id WHERE c.store_id=?1 GROUP BY c.id ORDER BY c.sort_order,c.name`).bind(a.storeId).all();
  return json({ok:true,categories:rows.results||[]});
}

export async function onRequestPost(context){
  const a=await requireAdminPermission(context,"company.products.write");if(!a.ok)return a.response;
  let b={};try{b=await context.request.json()}catch{return json({ok:false,message:"JSON inválido"},400)}
  const name=clean(b.name,180);if(!name)return json({ok:false,message:"Nome obrigatório"},400);
  const id=crypto.randomUUID(),now=new Date().toISOString(),slug=slugify(b.slug||name);
  await context.env.DB.prepare(`INSERT INTO categories(id,store_id,name,slug,description,active,sort_order,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8)`).bind(id,a.storeId,name,slug,clean(b.description,1000),b.active===false?0:1,Number(b.sortOrder||0),now).run();
  await logAdmin(context.env.DB,"category_created","category",id,{name},a.storeId);
  return json({ok:true,id},201);
}
