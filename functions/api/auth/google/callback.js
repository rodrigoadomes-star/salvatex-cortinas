import {googleClientId,googleClientSecret,googleRedirectUri,verifyGoogleState,safeTenantHost,safeReturnPath} from '../_google-oauth.js';
import {ensureMembership} from '../_tenant-account.js';

const enc=new TextEncoder();
function randomCode(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sha(value){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(value||''))));return [...d].map(x=>x.toString(16).padStart(2,'0')).join('')}
function errorPage(message,status=400){return new Response(`<!doctype html><meta charset="utf-8"><title>Login Google</title><style>body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f7f8fa;color:#172033}.box{max-width:520px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:30px;box-shadow:0 16px 50px #0b1c2d18}a{color:#175cd3}</style><div class="box"><h1>Não foi possível entrar com Google</h1><p>${String(message).replace(/[&<>"']/g,'')}</p><p><a href="https://radzhub.com.br">Voltar</a></p></div>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})}

export async function onRequestGet(context){
  if(!context.env.DB)return errorPage('Banco temporariamente indisponível.',503);
  const url=new URL(context.request.url),code=url.searchParams.get('code')||'',state=await verifyGoogleState(context,url.searchParams.get('state'));
  if(url.searchParams.get('error'))return errorPage('A autorização do Google foi cancelada.');
  if(!code||!state)return errorPage('A autorização expirou ou é inválida.');
  const host=safeTenantHost(state.host),storeId=String(state.storeId||'');if(!host||!storeId)return errorPage('Loja de destino inválida.');
  const store=await context.env.DB.prepare('SELECT id,slug,active FROM stores WHERE id=?1 LIMIT 1').bind(storeId).first();
  if(!store||Number(store.active)===0||`${store.slug}.radzhub.com.br`!==host)return errorPage('Loja de destino não encontrada.',404);
  const clientId=await googleClientId(context,storeId),clientSecret=googleClientSecret(context);if(!clientId||!clientSecret)return errorPage('Login Google ainda não foi configurado na plataforma.',503);
  let token;
  try{
    const body=new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:googleRedirectUri(context),grant_type:'authorization_code'});
    const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});token=await r.json();if(!r.ok||!token.access_token)throw new Error('token');
  }catch{return errorPage('Não foi possível validar a autorização com o Google.',502)}
  let profile;
  try{const r=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${token.access_token}`}});profile=await r.json();if(!r.ok||!profile.email||profile.email_verified===false)throw new Error('profile')}catch{return errorPage('Não foi possível obter sua conta do Google.',502)}
  const email=String(profile.email||'').trim().toLowerCase(),sub=String(profile.sub||''),now=new Date().toISOString();
  let account=await context.env.DB.prepare('SELECT id,email FROM customer_accounts WHERE google_sub=?1 OR lower(email)=?2 LIMIT 1').bind(sub,email).first();
  const accountId=account?.id||crypto.randomUUID();
  if(account){
    await context.env.DB.prepare(`UPDATE customer_accounts SET google_sub=?1,name=?2,picture=?3,email_verified=1,updated_at=?4 WHERE id=?5`).bind(sub,String(profile.name||''),String(profile.picture||''),now,accountId).run();
  }else{
    await context.env.DB.prepare(`INSERT INTO customer_accounts(id,email,name,google_sub,picture,provider,email_verified,active,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,'google',1,1,?6,?6)`).bind(accountId,email,String(profile.name||''),sub,String(profile.picture||''),now).run();
  }
  await ensureMembership(context.env.DB,storeId,accountId,{touchLogin:true});
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_oauth_exchanges(code_hash TEXT PRIMARY KEY,store_id TEXT NOT NULL,account_id TEXT NOT NULL,return_to TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`).run();
  await context.env.DB.prepare('DELETE FROM customer_oauth_exchanges WHERE expires_at<?1').bind(now).run();
  const exchange=randomCode(),hash=await sha(exchange),expires=new Date(Date.now()+5*60*1000).toISOString(),returnTo=safeReturnPath(state.returnTo);
  await context.env.DB.prepare(`INSERT INTO customer_oauth_exchanges(code_hash,store_id,account_id,return_to,expires_at,created_at) VALUES(?1,?2,?3,?4,?5,?6)`).bind(hash,storeId,accountId,returnTo,expires,now).run();
  return Response.redirect(`https://${host}/api/auth/google/complete?code=${encodeURIComponent(exchange)}`,302);
}
