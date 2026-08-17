import { requireRadzAdmin, json } from "../../../radz/api/_auth.js";
import { createMetaState } from "./_state.js";

export async function onRequestGet(context){
  const auth=await requireRadzAdmin(context);
  if(!auth.ok)return auth.response;

  const appId=String(context.env.META_APP_ID||"").trim();
  const appSecret=String(context.env.META_APP_SECRET||"").trim();
  const sessionSecret=String(context.env.RADZ_ADMIN_SESSION_SECRET||"").trim();
  const version=String(context.env.META_GRAPH_VERSION||"v24.0").trim();
  const requestUrl=new URL(context.request.url);
  const redirect=String(
    context.env.META_OAUTH_REDIRECT_URI||
    `${requestUrl.origin}/api/oauth/meta/callback`
  ).trim();

  if(!appId||!appSecret||!sessionSecret){
    return json({ok:false,code:"META_OAUTH_NOT_CONFIGURED",message:"Configure META_APP_ID, META_APP_SECRET e RADZ_ADMIN_SESSION_SECRET no Cloudflare."},503);
  }
  if(!context.env.DB){
    return json({ok:false,code:"DB_NOT_CONFIGURED",message:"Binding D1 DB não configurado."},503);
  }

  let companyId=String(requestUrl.searchParams.get("company_id")||"").trim();
  if(companyId){
    const company=await context.env.DB.prepare("SELECT id FROM platform_companies WHERE id=?1 AND status NOT IN ('cancelled') LIMIT 1").bind(companyId).first();
    if(!company)return json({ok:false,code:"COMPANY_NOT_FOUND",message:"Empresa não encontrada para a integração Meta."},404);
  }else{
    const preferred=await context.env.DB.prepare("SELECT id FROM platform_companies WHERE id='company-salvatex' AND status NOT IN ('cancelled') LIMIT 1").first();
    if(preferred)companyId=preferred.id;
    else{
      const only=await context.env.DB.prepare("SELECT id FROM platform_companies WHERE status NOT IN ('cancelled') ORDER BY created_at LIMIT 2").all();
      const rows=only.results||[];
      if(rows.length!==1)return json({ok:false,code:"COMPANY_REQUIRED",message:"Selecione a empresa antes de conectar a Meta."},400);
      companyId=rows[0].id;
    }
  }

  const state=await createMetaState(sessionSecret,companyId);
  const url=new URL(`https://www.facebook.com/${encodeURIComponent(version)}/dialog/oauth`);
  url.searchParams.set("client_id",appId);
  url.searchParams.set("redirect_uri",redirect);
  url.searchParams.set("state",state);
  url.searchParams.set("response_type","code");
  url.searchParams.set("scope","ads_read,ads_management,business_management");
  return Response.redirect(url.toString(),302);
}
