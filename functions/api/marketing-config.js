import {resolveStore} from '../admin/api/_tenant.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function parse(v){try{return JSON.parse(v||'{}')}catch{return {}}}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false},503);
  const store=await resolveStore(context);if(!store)return json({ok:false,code:'STORE_NOT_FOUND'},404);
  const row=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='marketing_config' LIMIT 1`).bind(store.id).first().catch(()=>null);
  const c=parse(row?.value_json);
  return json({ok:true,storeId:store.id,storeName:store.name,config:{
    meta:{enabled:!!c.meta?.enabled,pixelId:String(c.meta?.pixelId||''),capiEnabled:!!c.meta?.capiEnabled},
    google:{enabled:!!c.google?.enabled,ga4Id:String(c.google?.ga4Id||''),adsId:String(c.google?.adsId||''),adsConversionLabel:String(c.google?.adsConversionLabel||''),gtmId:String(c.google?.gtmId||'')},
    events:{pageView:c.events?.pageView!==false,viewContent:c.events?.viewContent!==false,addToCart:c.events?.addToCart!==false,beginCheckout:c.events?.beginCheckout!==false,purchase:c.events?.purchase!==false},
    consentRequired:c.consentRequired!==false
  }});
}
