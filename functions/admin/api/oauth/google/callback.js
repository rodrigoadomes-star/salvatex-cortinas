import {baseUrl,consumeState,getMarketing,saveMarketing,redirectAdmin} from "../_oauth.js";
export async function onRequestGet(context){
  const u=new URL(context.request.url),code=u.searchParams.get('code'),state=u.searchParams.get('state');
  const storeId=await consumeState(context.env.DB,'google',state);if(!storeId)return redirectAdmin(context,'google=state_error');
  if(!code)return redirectAdmin(context,'google=cancelled');
  const redirect=context.env.GOOGLE_ADS_OAUTH_REDIRECT_URI||baseUrl(context)+'/admin/api/oauth/google/callback';
  try{
    const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:context.env.GOOGLE_OAUTH_CLIENT_ID,client_secret:context.env.GOOGLE_OAUTH_CLIENT_SECRET,redirect_uri:redirect,grant_type:'authorization_code'})});
    const td=await tr.json();if(!tr.ok||!td.access_token)throw new Error('oauth_token_exchange_failed');
    const pr=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:'Bearer '+td.access_token}});if(!pr.ok)throw new Error('oauth_profile_failed');
    const profile=await pr.json(),cfg=await getMarketing(context.env.DB,storeId);cfg.connections=cfg.connections||{};cfg.connections.googleAds={connected:true,email:profile.email||'',name:profile.name||'',sub:profile.sub||'',credentialStorage:'cloudflare_secrets_only',connectedAt:new Date().toISOString()};
    await saveMarketing(context.env.DB,storeId,cfg);return redirectAdmin(context,'google=connected');
  }catch{console.error(JSON.stringify({event:'google_oauth_failed',storeId}));return redirectAdmin(context,'google=error')}
}
