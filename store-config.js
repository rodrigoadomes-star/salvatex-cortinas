import { json } from "./_lib.js";
export async function onRequestGet(context){
  if(!context.env.DB) return json({ok:false,config:null},503);
  try{const row=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id='salvatex' AND config_key='site_config'`).first(); if(!row)return json({ok:true,config:null}); let config=null;try{config=JSON.parse(row.value_json)}catch{} return json({ok:true,config});}catch{return json({ok:false,config:null},500)}
}
