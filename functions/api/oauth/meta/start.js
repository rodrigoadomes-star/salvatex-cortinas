import { requireRadzAdmin, json } from "../../../radz/api/_auth.js";
import { createMetaState } from "./_state.js";

export async function onRequestGet(context){
  const auth=await requireRadzAdmin(context);
  if(!auth.ok)return auth.response;

  const appId=String(context.env.META_APP_ID||"").trim();
  const appSecret=String(context.env.META_APP_SECRET||"").trim();
  const sessionSecret=String(context.env.RADZ_ADMIN_SESSION_SECRET||"").trim();
  const version=String(context.env.META_GRAPH_VERSION||"v24.0").trim();
  const redirect=String(
    context.env.META_OAUTH_REDIRECT_URI||
    `${new URL(context.request.url).origin}/api/oauth/meta/callback`
  ).trim();

  if(!appId||!appSecret||!sessionSecret){
    return json({
      ok:false,
      code:"META_OAUTH_NOT_CONFIGURED",
      message:"Configure META_APP_ID, META_APP_SECRET e RADZ_ADMIN_SESSION_SECRET no Cloudflare."
    },503);
  }

  const state=await createMetaState(sessionSecret);
  const url=new URL(`https://www.facebook.com/${encodeURIComponent(version)}/dialog/oauth`);
  url.searchParams.set("client_id",appId);
  url.searchParams.set("redirect_uri",redirect);
  url.searchParams.set("state",state);
  url.searchParams.set("response_type","code");
  url.searchParams.set("scope","ads_read,ads_management,business_management");

  return json({ok:true,url:url.toString(),redirectUri:redirect});
}
