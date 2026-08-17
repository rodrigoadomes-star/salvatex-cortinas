import { requireRadzAdmin, json } from "./_auth.js";

const present = value => Boolean(String(value ?? "").trim());

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
    }
  };

  const missing=[];
  for(const [group,items] of Object.entries(checks)){
    for(const [name,ok] of Object.entries(items))if(!ok)missing.push(`${group}.${name}`);
  }

  return json({
    ok:true,
    ready:missing.length===0,
    checks,
    missing,
    note:"Somente presença/ausência é retornada. Nenhum secret é exposto."
  });
}
