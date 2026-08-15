import { json, requireAdmin, logAdmin } from "./_auth.js";

function parse(value,fallback={}){ try{return JSON.parse(value||"{}")}catch{return fallback} }
const DEFAULTS={
  meta:{enabled:false,pixelId:"",capiEnabled:false,testEventCode:"",graphVersion:"v24.0"},
  google:{enabled:false,tagId:"",ga4Id:"",adsId:"",adsConversionLabel:"",gtmId:"",merchantCenterId:"",clientId:""},
  events:{pageView:true,viewContent:true,addToCart:true,beginCheckout:true,purchase:true,whatsappLead:true},
  connections:{meta:null,googleAds:null}
};
function merge(a,b){ if(!b||typeof b!=="object"||Array.isArray(b))return a; for(const[k,v]of Object.entries(b)){ if(v&&typeof v==="object"&&!Array.isArray(v))a[k]=merge(a[k]&&typeof a[k]==="object"&&!Array.isArray(a[k])?a[k]:{},v); else a[k]=v } return a }
async function read(db){const row=await db.prepare(`SELECT value_json,updated_at FROM store_configs WHERE store_id='salvatex' AND config_key='marketing_config'`).first();return{config:merge(structuredClone(DEFAULTS),parse(row?.value_json,{})),updatedAt:row?.updated_at||null}}
export async function onRequestGet(context){const a=await requireAdmin(context);if(!a.ok)return a.response;const d=await read(context.env.DB);return json({ok:true,...d,environment:{metaAppConfigured:Boolean(context.env.META_APP_ID&&context.env.META_APP_SECRET),googleOAuthConfigured:Boolean(context.env.GOOGLE_OAUTH_CLIENT_ID&&context.env.GOOGLE_OAUTH_CLIENT_SECRET),metaCapiSecretConfigured:Boolean(context.env.META_CAPI_ACCESS_TOKEN),customerSessionConfigured:Boolean(context.env.CUSTOMER_SESSION_SECRET)}},200,{"Cache-Control":"no-store"})}
export async function onRequestPut(context){const a=await requireAdmin(context);if(!a.ok)return a.response;let body={};try{body=await context.request.json()}catch{return json({ok:false,message:"JSON inválido."},400)};const old=(await read(context.env.DB)).config;const incoming=body.config&&typeof body.config==='object'?body.config:{};const cfg=merge(old,incoming);const now=new Date().toISOString();await context.env.DB.prepare(`INSERT INTO store_configs(store_id,config_key,value_json,updated_at) VALUES('salvatex','marketing_config',?1,?2) ON CONFLICT(store_id,config_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).bind(JSON.stringify(cfg),now).run();await logAdmin(context.env.DB,'marketing_config_updated','store_config','marketing_config',{metaEnabled:cfg.meta.enabled,googleEnabled:cfg.google.enabled});return json({ok:true,config:cfg,updatedAt:now})}
