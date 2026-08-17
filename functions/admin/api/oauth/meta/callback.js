import {baseUrl,consumeState,getMarketing,saveMarketing,redirectAdmin} from "../_oauth.js";
export async function onRequestGet(context){
  const u=new URL(context.request.url),code=u.searchParams.get('code'),state=u.searchParams.get('state');
  const storeId=await consumeState(context.env.DB,'meta',state);if(!storeId)return redirectAdmin(context,'meta=state_error');
  if(!code)return redirectAdmin(context,'meta=cancelled');
  const redirect=context.env.META_OAUTH_REDIRECT_URI||baseUrl(context)+'/admin/api/oauth/meta/callback';
  const version=context.env.META_GRAPH_VERSION||'v24.0';
  const tokenUrl=new URL(`https://graph.facebook.com/${version}/oauth/access_token`);tokenUrl.searchParams.set('client_id',context.env.META_APP_ID);tokenUrl.searchParams.set('client_secret',context.env.META_APP_SECRET);tokenUrl.searchParams.set('redirect_uri',redirect);tokenUrl.searchParams.set('code',code);
  try{
    const tr=await fetch(tokenUrl),td=await tr.json();if(!tr.ok||!td.access_token)throw new Error('oauth_token_exchange_failed');
    const pr=await fetch(`https://graph.facebook.com/${version}/me?fields=id,name&access_token=${encodeURIComponent(td.access_token)}`);if(!pr.ok)throw new Error('oauth_profile_failed');
    const profile=await pr.json(),cfg=await getMarketing(context.env.DB,storeId);cfg.connections=cfg.connections||{};cfg.connections.meta={connected:true,id:profile.id||'',name:profile.name||'',credentialStorage:'cloudflare_secrets_only',connectedAt:new Date().toISOString()};
    await saveMarketing(context.env.DB,storeId,cfg);return redirectAdmin(context,'meta=connected');
  }catch{console.error(JSON.stringify({event:'meta_oauth_failed',storeId}));return redirectAdmin(context,'meta=error')}
}
