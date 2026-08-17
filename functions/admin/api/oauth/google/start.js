import { json, requireAdmin } from "../../_auth.js";
import {baseUrl,saveState} from "../_oauth.js";
export async function onRequestGet(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;
  if(!context.env.GOOGLE_OAUTH_CLIENT_ID||!context.env.GOOGLE_OAUTH_CLIENT_SECRET)return json({ok:false,message:'Configure GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no Cloudflare.'},503);
  const state=crypto.randomUUID();
  await saveState(context.env.DB,'google',state,a.storeId);
  const redirect=context.env.GOOGLE_ADS_OAUTH_REDIRECT_URI||baseUrl(context)+'/admin/api/oauth/google/callback';
  const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id',context.env.GOOGLE_OAUTH_CLIENT_ID);u.searchParams.set('redirect_uri',redirect);u.searchParams.set('response_type','code');u.searchParams.set('access_type','offline');u.searchParams.set('prompt','consent');u.searchParams.set('state',state);u.searchParams.set('scope','openid email profile https://www.googleapis.com/auth/adwords');
  return json({ok:true,url:u.toString()});
}
