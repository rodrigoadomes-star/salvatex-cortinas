import { json, clean, slugify, logAdmin } from "../../_auth.js";
import { requireAdminPermission } from "../../_permissions.js";

export async function onRequestPut(context){
  const a=await requireAdminPermission(context,"company.products.write");if(!a.ok)return a.response;
  let b={};try{b=await context.request.json()}catch{return json({ok:false},400)}
  const id=context.params.id,name=clean(b.name,180),now=new Date().toISOString();
  const result=await context.env.DB.prepare(`UPDATE categories SET name=?1,slug=?2,description=?3,active=?4,sort_order=?5,updated_at=?6 WHERE id=?7 AND store_id=?8`).bind(name,slugify(b.slug||name),clean(b.description,1000),b.active===false?0:1,Number(b.sortOrder||0),now,id,a.storeId).run();
  if(!result.meta?.changes)return json({ok:false,message:"Categoria não encontrada."},404);
  await logAdmin(context.env.DB,"category_updated","category",id,{name,active:b.active!==false},a.storeId);
  return json({ok:true});
}

export async function onRequestDelete(context){
  const a=await requireAdminPermission(context,"company.products.delete");if(!a.ok)return a.response;
  const id=context.params.id,now=new Date().toISOString();
  const result=await context.env.DB.prepare(`UPDATE categories SET active=0,updated_at=?1 WHERE id=?2 AND store_id=?3`).bind(now,id,a.storeId).run();
  if(!result.meta?.changes)return json({ok:false,message:"Categoria não encontrada."},404);
  await logAdmin(context.env.DB,"category_soft_deleted","category",id,{active:false},a.storeId);
  return json({ok:true,softDeleted:true});
}
