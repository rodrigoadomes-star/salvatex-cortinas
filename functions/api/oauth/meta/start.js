import { requireRadzAdmin, json } from "../../../radz/api/_auth.js";
import { requireAdmin } from "../../../admin/api/_auth.js";
import { createMetaState } from "./_state.js";

async function companyForStore(db,storeId){
  return db.prepare(`SELECT c.id,c.plan_code FROM platform_company_stores pcs JOIN platform_companies c ON c.id=pcs.company_id WHERE pcs.store_id=?1 LIMIT 1`).bind(storeId).first();
}
function isBusiness(plan){return String(plan||'').trim().toLowerCase()==='business'}

export async function onRequestGet(context){
  const appId=String(context.env.META_APP_ID||"").trim();
  const appSecret=String(context.env.META_APP_SECRET||"").trim();
  const sessionSecret=String(context.env.RADZ_ADMIN_SESSION_SECRET||"").trim();
  const version=String(context.env.META_GRAPH_VERSION||"v24.0").trim();
  const requestUrl=new URL(context.request.url);
  const redirect=String(context.env.META_OAUTH_REDIRECT_URI||`${requestUrl.origin}/api/oauth/meta/callback`).trim();

  if(!appId||!appSecret||!sessionSecret)return json({ok:false,code:"META_OAUTH_NOT_CONFIGURED",message:"Configure META_APP_ID, META_APP_SECRET e RADZ_ADMIN_SESSION_SECRET no Cloudflare."},503);
  if(!context.env.DB)return json({ok:false,code:"DB_NOT_CONFIGURED",message:"Binding D1 DB não configurado."},503);

  let companyId='';
  let source='superadmin';
  let returnTo='/radz-admin/';

  const tenantAuth=await requireAdmin(context);
  if(tenantAuth.ok){
    const company=await companyForStore(context.env.DB,tenantAuth.storeId);
    if(!company?.id)return json({ok:false,code:'COMPANY_NOT_FOUND',message:'Empresa não vinculada à plataforma.'},404);
    if(!isBusiness(company.plan_code))return json({ok:false,code:'BUSINESS_PLAN_REQUIRED',message:'Meta Ads (Beta) está disponível somente no plano Business.'},403);
    companyId=String(company.id);source='tenant';returnTo='/admin/#meta';
  }else{
    const auth=await requireRadzAdmin(context);if(!auth.ok)return auth.response;
    companyId=String(requestUrl.searchParams.get("company_id")||"").trim();
    if(companyId){
      const company=await context.env.DB.prepare("SELECT id FROM platform_companies WHERE id=?1 AND status NOT IN ('cancelled') LIMIT 1").bind(companyId).first();
      if(!company)return json({ok:false,code:"COMPANY_NOT_FOUND",message:"Empresa não encontrada para a integração Meta."},404);
    }else return json({ok:false,code:"COMPANY_REQUIRED",message:"Selecione a empresa antes de conectar a Meta."},400);
  }

  const state=await createMetaState(sessionSecret,companyId,{source,returnTo});
  const url=new URL(`https://www.facebook.com/${encodeURIComponent(version)}/dialog/oauth`);
  url.searchParams.set("client_id",appId);url.searchParams.set("redirect_uri",redirect);url.searchParams.set("state",state);url.searchParams.set("response_type","code");url.searchParams.set("scope","ads_read,ads_management,business_management");
  return Response.redirect(url.toString(),302);
}
