import {json} from '../../_lib.js';
import {requirePublicStore} from '../../_tenant.js';
import {googleClientId,googleRedirectUri,signGoogleState,safeReturnPath} from '../_google-oauth.js';

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:'Banco indisponível.'},503);
  const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;
  const clientId=await googleClientId(context,tenant.storeId);if(!clientId)return json({ok:false,message:'Login Google ainda não foi configurado.'},503);
  const url=new URL(context.request.url),returnTo=safeReturnPath(url.searchParams.get('return_to'));
  const state=await signGoogleState(context,{storeId:tenant.storeId,host:tenant.store.host,returnTo,nonce:crypto.randomUUID(),exp:Date.now()+10*60*1000});
  const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.searchParams.set('client_id',clientId);
  auth.searchParams.set('redirect_uri',googleRedirectUri(context));
  auth.searchParams.set('response_type','code');
  auth.searchParams.set('scope','openid email profile');
  auth.searchParams.set('state',state);
  auth.searchParams.set('prompt','select_account');
  auth.searchParams.set('include_granted_scopes','true');
  return Response.redirect(auth.toString(),302);
}
