import { json } from "./_lib.js";
import { requirePublicStore } from "./_tenant.js";
export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,config:null},503);
  const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;
  try{const row=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='site_config'`).bind(tenant.storeId).first();if(!row)return json({ok:true,config:null});let config=null;try{config=JSON.parse(row.value_json)}catch{}return json({ok:true,config});}catch{return json({ok:false,config:null},500)}
}
