import { json, requireAdmin } from "../../_auth.js";
import {baseUrl,saveState} from "../_oauth.js";
export async function onRequestGet(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;
  if(!context.env.META_APP_ID||!context.env.META_APP_SECRET)return json({ok:false,message:'Configure META_APP_ID e META_APP_SECRET no Cloudflare.'},503);
  const state=crypto.randomUUID();
  await saveState(context.env.DB,'meta',state,a.storeId);
  const redirect=context.env.META_OAUTH_REDIRECT_URI||baseUrl(context)+'/admin/api/oauth/meta/callback';
  const u=new URL('https://www.facebook.com/v24.0/dialog/oauth');
  u.searchParams.set('client_id',context.env.META_APP_ID);u.searchParams.set('redirect_uri',redirect);u.searchParams.set('state',state);u.searchParams.set('scope','business_management,ads_read');
  return json({ok:true,url:u.toString()});
}
