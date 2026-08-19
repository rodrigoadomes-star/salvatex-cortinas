import { json } from "./_lib.js";
import { requirePublicStore } from "./_tenant.js";
function parse(v,f={}){try{return JSON.parse(v||"{}")}catch{return f}}
async function fallbackGoogleClientId(db){
  if(!db)return'';
  try{
    const row=await db.prepare(`SELECT value_json FROM store_configs WHERE store_id='salvatex' AND config_key='marketing_config'`).first();
    return String(parse(row?.value_json,{}).google?.clientId||'');
  }catch{return''}
}
export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:true,config:{}},200,{"Cache-Control":"no-store"});
  const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;
  const row=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='marketing_config'`).bind(tenant.storeId).first();
  const raw=parse(row?.value_json,{});
  const clientId=String(raw.google?.clientId||context.env.GOOGLE_OAUTH_CLIENT_ID||await fallbackGoogleClientId(context.env.DB)||'');
  const config={meta:{enabled:Boolean(raw.meta?.enabled),pixelId:String(raw.meta?.pixelId||''),capiEnabled:Boolean(raw.meta?.capiEnabled)},google:{enabled:Boolean(raw.google?.enabled||clientId),tagId:String(raw.google?.tagId||''),ga4Id:String(raw.google?.ga4Id||''),adsId:String(raw.google?.adsId||''),adsConversionLabel:String(raw.google?.adsConversionLabel||''),gtmId:String(raw.google?.gtmId||''),merchantCenterId:String(raw.google?.merchantCenterId||''),clientId},events:raw.events||{}};
  return json({ok:true,config},200,{"Cache-Control":"public, max-age=60"});
}
