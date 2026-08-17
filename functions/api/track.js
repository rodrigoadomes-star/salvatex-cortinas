import { json, cleanText } from "./_lib.js";
import { requireStoreTenant } from "../_shared/tenant.js";
function parse(v,f={}){try{return JSON.parse(v||"{}")}catch{return f}}
function sha256Hex(str){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)).then(b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''))}
function eventEnabled(cfg,eventName){const map={PageView:'pageView',ViewContent:'viewContent',AddToCart:'addToCart',InitiateCheckout:'beginCheckout',Purchase:'purchase',Lead:'whatsappLead'};const key=map[eventName];return !key||cfg.events?.[key]!==false}
export async function onRequestPost(context){
  if(!context.env.DB)return json({ok:true,forwarded:false});
  const tenant=await requireStoreTenant(context,{allowPreview:true});if(!tenant.ok)return tenant.response;
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const row=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='marketing_config'`).bind(tenant.tenant.storeId).first();
  const cfg=parse(row?.value_json,{});
  if(!cfg.meta?.enabled||!cfg.meta?.capiEnabled||!cfg.meta?.pixelId||!context.env.META_CAPI_ACCESS_TOKEN)return json({ok:true,forwarded:false});
  const allowedEvents=new Set(['PageView','ViewContent','AddToCart','InitiateCheckout','Purchase','Lead']);
  const eventName=cleanText(body.eventName||'PageView',80);if(!allowedEvents.has(eventName))return json({ok:false,message:'Evento inválido.'},400);
  if(!eventEnabled(cfg,eventName))return json({ok:true,forwarded:false,reason:'event_disabled'});
  const url=cleanText(body.url||context.request.headers.get('referer')||'',1000);
  const email=cleanText(body.email||'',320).trim().toLowerCase();
  const phone=cleanText(body.phone||'',40).replace(/\D/g,'');
  const user_data={client_user_agent:context.request.headers.get('user-agent')||'',client_ip_address:context.request.headers.get('cf-connecting-ip')||undefined};
  if(email)user_data.em=[await sha256Hex(email)];if(phone)user_data.ph=[await sha256Hex(phone)];
  const params=body.params&&typeof body.params==='object'?body.params:{};
  const custom_data={currency:cleanText(params.currency||'BRL',8)||'BRL',value:Number(params.value||0)||0};
  if(params.content_id)custom_data.content_ids=[cleanText(params.content_id,160)];
  else if(Array.isArray(params.content_ids))custom_data.content_ids=params.content_ids.slice(0,50).map(x=>cleanText(x,160)).filter(Boolean);
  if(params.content_name)custom_data.content_name=cleanText(params.content_name,240);
  if(params.content_type)custom_data.content_type=cleanText(params.content_type,80);
  if(params.transaction_id)custom_data.order_id=cleanText(params.transaction_id,160);
  const payload={data:[{event_name:eventName,event_time:Math.floor(Date.now()/1000),event_source_url:url,action_source:'website',event_id:cleanText(body.eventId||crypto.randomUUID(),120),user_data,custom_data}]};
  if(cfg.meta.testEventCode)payload.test_event_code=cfg.meta.testEventCode;
  const version=String(cfg.meta.graphVersion||context.env.META_GRAPH_VERSION||'v24.0');
  const endpoint=`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(cfg.meta.pixelId)}/events?access_token=${encodeURIComponent(context.env.META_CAPI_ACCESS_TOKEN)}`;
  try{
    const res=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const out=await res.json().catch(()=>({}));
    return json({ok:res.ok,forwarded:res.ok,meta:res.ok?undefined:out},res.ok?200:502);
  }catch{return json({ok:false,forwarded:false,message:'Falha ao enviar evento CAPI.'},502)}
}
