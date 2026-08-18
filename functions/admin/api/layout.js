import { json, requireAdmin, logAdmin } from "./_auth.js";

function parseJson(value,fallback={}){try{return JSON.parse(value||"{}")}catch{return fallback}}

async function readLayout(db,storeId){
  const dedicated=await db.prepare(`SELECT value_json,updated_at FROM store_configs WHERE store_id=?1 AND config_key='layout_config'`).bind(storeId).first();
  const dedicatedLayout=parseJson(dedicated?.value_json,null);
  const siteRow=await db.prepare(`SELECT value_json,updated_at FROM store_configs WHERE store_id=?1 AND config_key='site_config'`).bind(storeId).first();
  const siteConfig=parseJson(siteRow?.value_json,{});
  const fallbackLayout=siteConfig?.layout&&typeof siteConfig.layout==='object'?siteConfig.layout:null;
  const layout=dedicatedLayout&&typeof dedicatedLayout==='object'&&Object.keys(dedicatedLayout).length?dedicatedLayout:(fallbackLayout||{});
  return {layout,updatedAt:dedicated?.updated_at||siteRow?.updated_at||null,source:dedicatedLayout&&Object.keys(dedicatedLayout||{}).length?'layout_config':fallbackLayout?'site_config.layout':'default'};
}

const capabilities={
  branding:['logo','favicon','colors','fonts','buttons'],
  header:['style','sticky','menu','announcementBar'],
  hero:['enabled','layout','image','eyebrow','title','subtitle','primaryAction','secondaryAction'],
  homeSections:['categories','featuredProducts','banners','benefits','testimonials','faq','customHtml'],
  cards:['radius','shadow','imageRatio','spacing','columns'],
  footer:['columns','contact','social','whatsapp','legal'],
  responsive:['desktop','tablet','mobile'],
  presets:['minimal','editorial','catalog','premium']
};

export async function onRequestGet(context){
  const auth=await requireAdmin(context);if(!auth.ok)return auth.response;
  try{const data=await readLayout(context.env.DB,auth.storeId);return json({ok:true,store:auth.store,capabilities,...data},200,{"Cache-Control":"no-store, no-cache, must-revalidate"})}catch(error){console.error('admin layout get',error);return json({ok:false,layout:null,message:'Não foi possível carregar o layout.'},500)}
}

export async function onRequestPut(context){
  const auth=await requireAdmin(context);if(!auth.ok)return auth.response;
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const layout=body.layout&&typeof body.layout==='object'&&!Array.isArray(body.layout)?body.layout:null;
  if(!layout)return json({ok:false,message:'Layout inválido.'},400);
  const now=new Date().toISOString(),storeId=auth.storeId;
  try{
    await context.env.DB.prepare(`INSERT INTO store_configs(store_id,config_key,value_json,updated_at) VALUES(?1,'layout_config',?2,?3) ON CONFLICT(store_id,config_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).bind(storeId,JSON.stringify(layout),now).run();
    const siteRow=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='site_config'`).bind(storeId).first();
    const siteConfig=parseJson(siteRow?.value_json,{});siteConfig.layout=layout;
    await context.env.DB.prepare(`INSERT INTO store_configs(store_id,config_key,value_json,updated_at) VALUES(?1,'site_config',?2,?3) ON CONFLICT(store_id,config_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).bind(storeId,JSON.stringify(siteConfig),now).run();
    const saved=await readLayout(context.env.DB,storeId);
    if(JSON.stringify(saved.layout)!==JSON.stringify(layout))throw new Error('A leitura de confirmação não corresponde ao layout enviado.');
    await logAdmin(context.env.DB,'layout_updated','store_config','layout_config',{source:'layout_editor',confirmed:true},storeId);
    return json({ok:true,store:auth.store,layout:saved.layout,updatedAt:saved.updatedAt||now,source:saved.source,confirmed:true,capabilities},200,{"Cache-Control":"no-store, no-cache, must-revalidate"});
  }catch(error){console.error('admin layout put',error);return json({ok:false,message:'Não foi possível salvar o layout no D1: '+String(error?.message||error)},500)}
}
