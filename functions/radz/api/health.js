import { requireRadzAdmin, json } from "./_auth.js";

const present = value => Boolean(String(value ?? "").trim());

async function tableColumns(db,table){
  try{
    const rows=await db.prepare(`PRAGMA table_info(${table})`).all();
    return new Set((rows.results||[]).map(row=>String(row.name||"")));
  }catch{return new Set();}
}

async function tableExists(db,name){
  try{
    const row=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1 LIMIT 1").bind(name).first();
    return Boolean(row?.name);
  }catch{return false;}
}

export async function onRequestGet(context){
  const auth=await requireRadzAdmin(context);
  if(!auth.ok)return auth.response;

  const env=context.env||{};
  const checks={
    bindings:{
      DB:Boolean(env.DB),
      MEDIA:Boolean(env.MEDIA)
    },
    radz:{
      RADZ_ADMIN_TOKEN:present(env.RADZ_ADMIN_TOKEN),
      RADZ_ADMIN_SESSION_SECRET:present(env.RADZ_ADMIN_SESSION_SECRET),
      META_APP_ID:present(env.META_APP_ID),
      META_APP_SECRET:present(env.META_APP_SECRET),
      META_GRAPH_VERSION:present(env.META_GRAPH_VERSION),
      META_OAUTH_REDIRECT_URI:present(env.META_OAUTH_REDIRECT_URI),
      META_CREDENTIALS_KEY:present(env.META_CREDENTIALS_KEY)
    },
    salvatex_legacy_runtime:{
      ADMIN_TOKEN:present(env.ADMIN_TOKEN),
      ADMIN_SESSION_SECRET:present(env.ADMIN_SESSION_SECRET),
      CUSTOMER_SESSION_SECRET:present(env.CUSTOMER_SESSION_SECRET),
      TURNSTILE_ENFORCE:present(env.TURNSTILE_ENFORCE),
      TURNSTILE_SECRET_KEY:present(env.TURNSTILE_SECRET_KEY),
      TURNSTILE_SITE_KEY:present(env.TURNSTILE_SITE_KEY),
      GOOGLE_OAUTH_CLIENT_ID:present(env.GOOGLE_OAUTH_CLIENT_ID),
      GOOGLE_OAUTH_CLIENT_SECRET:present(env.GOOGLE_OAUTH_CLIENT_SECRET),
      GOOGLE_ADS_OAUTH_REDIRECT_URI:present(env.GOOGLE_ADS_OAUTH_REDIRECT_URI)
    },
    d1:{}
  };

  const schema={pages:{exists:false,optionalColumnsMissing:[]},radzTables:{}};
  if(env.DB){
    const pages=await tableColumns(env.DB,"pages");
    schema.pages.exists=pages.has("id")&&pages.has("title")&&pages.has("slug");
    schema.pages.optionalColumnsMissing=["page_type","hero_image_url","measures_json","custom_measure_url","nav_group","nav_order"].filter(name=>!pages.has(name));
    checks.d1.pages=schema.pages.exists;
    checks.d1.store_configs=await tableExists(env.DB,"store_configs");
    for(const name of ["platform_companies","platform_analytics_events","platform_analytics_daily","platform_integrations","platform_meta_ad_accounts"]){
      const ok=await tableExists(env.DB,name);
      schema.radzTables[name]=ok;
      checks.d1[name]=ok;
    }
  }else{
    checks.d1.pages=false;
    checks.d1.store_configs=false;
    for(const name of ["platform_companies","platform_analytics_events","platform_analytics_daily","platform_integrations","platform_meta_ad_accounts"]){checks.d1[name]=false;schema.radzTables[name]=false;}
  }

  const missing=[];
  for(const [group,items] of Object.entries(checks)){
    for(const [name,ok] of Object.entries(items))if(!ok)missing.push(`${group}.${name}`);
  }

  return json({
    ok:true,
    ready:missing.length===0,
    checks,
    schema,
    missing,
    note:"Somente presença/ausência e compatibilidade de schema são retornadas. Nenhum secret é exposto."
  });
}
