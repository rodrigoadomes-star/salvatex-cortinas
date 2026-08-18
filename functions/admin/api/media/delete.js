import { json, requireAdmin, logAdmin } from "../_auth.js";
function slug(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)}
export async function onRequestDelete(context){
  const auth=await requireAdmin(context);if(!auth.ok)return auth.response;
  const storeId=auth.storeId;if(!context.env.MEDIA)return json({ok:false,message:"Binding R2 MEDIA não configurado."},503);
  const url=new URL(context.request.url),key=String(url.searchParams.get("key")||"").trim();
  if(!key||key.startsWith("private/"))return json({ok:false,message:"Arquivo não informado."},400);
  const tenantPrefix=`tenants/${slug(storeId)}/configuradores/`;
  const legacySalvatex=storeId==='salvatex'&&key.startsWith('configuradores/');
  const scopedTenant=key.startsWith(tenantPrefix);
  if(!legacySalvatex&&!scopedTenant)return json({ok:false,message:"Arquivo não pertence a esta empresa."},403);
  const object=await context.env.MEDIA.head(key);
  if(!object)return json({ok:false,message:"Arquivo não encontrado."},404);
  const metadataStore=String(object.customMetadata?.storeId||'');
  if(metadataStore&&metadataStore!==storeId)return json({ok:false,message:"Arquivo não pertence a esta empresa."},403);
  await context.env.MEDIA.delete(key);
  await logAdmin(context.env.DB,"media_deleted","media",key,{},storeId);
  return json({ok:true,key});
}
