import { json } from "./_lib.js";
import { requireStoreTenant } from "../_shared/tenant.js";
function parse(v,f={}){try{return JSON.parse(v||"{}")}catch{return f}}
export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:true,config:{}},200,{"Cache-Control":"no-store"});
  const tenant=await requireStoreTenant(context,{allowPreview:true});if(!tenant.ok)return tenant.response;
  const row=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='marketing_config'`).bind(tenant.tenant.storeId).first();
  const raw=parse(row?.value_json,{});
  const config={
    meta:{enabled:Boolean(raw.meta?.enabled),pixelId:String(raw.meta?.pixelId||''),capiEnabled:Boolean(raw.meta?.capiEnabled)},
    google:{enabled:Boolean(raw.google?.enabled),tagId:String(raw.google?.tagId||''),ga4Id:String(raw.google?.ga4Id||''),adsId:String(raw.google?.adsId||''),adsConversionLabel:String(raw.google?.adsConversionLabel||''),gtmId:String(raw.google?.gtmId||''),merchantCenterId:String(raw.google?.merchantCenterId||''),clientId:String(raw.google?.clientId||context.env.GOOGLE_OAUTH_CLIENT_ID||'')},
    events:raw.events||{}
  };
  return json({ok:true,config},200,{"Cache-Control":"public, max-age=60"});
}
