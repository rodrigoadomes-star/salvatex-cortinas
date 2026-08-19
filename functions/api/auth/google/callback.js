import {googleClientId,googleClientSecret,googleRedirectUri,verifyGoogleState,safeTenantHost,safeReturnPath} from '../_google-oauth.js';
import {ensureMembership} from '../_tenant-account.js';

const enc=new TextEncoder();
function randomCode(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sha(value){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(value||''))));return [...d].map(x=>x.toString(16).padStart(2,'0')).join('')}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function errorPage(message,status=400,host='',reference=''){
  const safeHost=safeTenantHost(host);
  const back=safeHost?`https://${safeHost}/minha-conta.html`:'https://radzhub.com.br';
  const ref=reference?`<p style="font-size:12px;color:#667085">Referência: ${esc(reference)}</p>`:'';
  return new Response(`<!doctype html><meta charset="utf-8"><title>Login Google</title><style>body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f7f8fa;color:#172033}.box{max-width:520px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:30px;box-shadow:0 16px 50px #0b1c2d18}a{color:#175cd3}</style><div class="box"><h1>Não foi possível entrar com Google</h1><p>${esc(message)}</p>${ref}<p><a href="${back}">Voltar para a loja</a></p></div>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})
}
async function tableColumns(db,table){const r=await db.prepare(`PRAGMA table_info(${table})`).all();return new Set((r.results||[]).map(c=>String(c.name)))}
async function ensureGoogleCustomerSchema(db){
  let names=await tableColumns(db,'customer_accounts');
  if(!names.size)throw new Error('customer_accounts_missing');
  const add=async(name,sql)=>{if(!names.has(name)){await db.prepare(`ALTER TABLE customer_accounts ADD COLUMN ${name} ${sql}`).run();names.add(name)}};
  await add('google_sub','TEXT');await add('picture','TEXT');await add('provider',"TEXT DEFAULT 'password'");await add('email_verified','INTEGER DEFAULT 0');await add('active','INTEGER DEFAULT 1');await add('updated_at','TEXT');await add('session_version','INTEGER DEFAULT 1');
  try{await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_accounts_google_sub ON customer_accounts(google_sub) WHERE google_sub IS NOT NULL').run()}catch{}
}
async function ensureExchangeSchema(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS customer_oauth_exchanges(code_hash TEXT PRIMARY KEY,store_id TEXT NOT NULL,account_id TEXT NOT NULL,return_to TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`).run();
  const cols=await tableColumns(db,'customer_oauth_exchanges');
  const add=async(name,sql)=>{if(!cols.has(name)){await db.prepare(`ALTER TABLE customer_oauth_exchanges ADD COLUMN ${name} ${sql}`).run();cols.add(name)}};
  await add('store_id','TEXT');await add('account_id','TEXT');await add('return_to',"TEXT DEFAULT '/minha-conta.html'");await add('expires_at','TEXT');await add('created_at','TEXT');
}

export async function onRequestGet(context){
  let stage='start',returnHost='';
  try{
    if(!context.env.DB)return errorPage('Banco temporariamente indisponível.',503);
    const url=new URL(context.request.url),rawState=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'',state=await verifyGoogleState(context,rawState);
    if(state?.host)returnHost=String(state.host);
    if(url.searchParams.get('error'))return errorPage('A autorização do Google foi cancelada.',400,returnHost);
    if(!code||!state)return errorPage('A autorização expirou ou é inválida.',400,returnHost);
    stage='tenant';
    const host=safeTenantHost(state.host),storeId=String(state.storeId||'');returnHost=host||returnHost;
    if(!host||!storeId)return errorPage('Loja de destino inválida.',400,returnHost);
    const store=await context.env.DB.prepare('SELECT id,slug,active FROM stores WHERE id=?1 LIMIT 1').bind(storeId).first();
    if(!store||Number(store.active)===0||`${store.slug}.radzhub.com.br`!==host)return errorPage('Loja de destino não encontrada.',404,returnHost);
    stage='credentials';
    const clientId=await googleClientId(context,storeId),clientSecret=googleClientSecret(context);if(!clientId||!clientSecret)return errorPage('Login Google ainda não foi configurado na plataforma.',503,returnHost);
    stage='token';
    const body=new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:googleRedirectUri(context),grant_type:'authorization_code'});
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
    const token=await tokenResponse.json().catch(()=>({}));
    if(!tokenResponse.ok||!token.access_token)return errorPage('Não foi possível validar a autorização com o Google.',502,returnHost,'GOOGLE_TOKEN');
    stage='profile';
    const profileResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${token.access_token}`}});
    const profile=await profileResponse.json().catch(()=>({}));
    if(!profileResponse.ok||!profile.email||profile.email_verified===false)return errorPage('Não foi possível obter sua conta do Google.',502,returnHost,'GOOGLE_PROFILE');
    stage='schema';
    await ensureGoogleCustomerSchema(context.env.DB);
    await ensureExchangeSchema(context.env.DB);
    stage='account';
    const email=String(profile.email||'').trim().toLowerCase(),sub=String(profile.sub||''),now=new Date().toISOString();
    let account=await context.env.DB.prepare('SELECT id,email FROM customer_accounts WHERE google_sub=?1 OR lower(email)=?2 LIMIT 1').bind(sub,email).first();
    const accountId=account?.id||crypto.randomUUID();
    if(account){
      await context.env.DB.prepare(`UPDATE customer_accounts SET google_sub=?1,name=?2,picture=?3,provider='google',email_verified=1,active=1,updated_at=?4 WHERE id=?5`).bind(sub,String(profile.name||''),String(profile.picture||''),now,accountId).run();
    }else{
      await context.env.DB.prepare(`INSERT INTO customer_accounts(id,email,name,google_sub,picture,provider,email_verified,active,session_version,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,'google',1,1,1,?6,?6)`).bind(accountId,email,String(profile.name||''),sub,String(profile.picture||''),now).run();
    }
    stage='membership';
    await ensureMembership(context.env.DB,storeId,accountId,{touchLogin:true});
    stage='exchange';
    await context.env.DB.prepare('DELETE FROM customer_oauth_exchanges WHERE expires_at IS NOT NULL AND expires_at<?1').bind(now).run();
    const exchange=randomCode(),hash=await sha(exchange),expires=new Date(Date.now()+5*60*1000).toISOString(),returnTo=safeReturnPath(state.returnTo);
    await context.env.DB.prepare(`INSERT INTO customer_oauth_exchanges(code_hash,store_id,account_id,return_to,expires_at,created_at) VALUES(?1,?2,?3,?4,?5,?6)`).bind(hash,storeId,accountId,returnTo,expires,now).run();
    return Response.redirect(`https://${host}/api/auth/google/complete?code=${encodeURIComponent(exchange)}`,302);
  }catch(error){
    const reference=`GOOGLE_${stage.toUpperCase()}_${crypto.randomUUID().slice(0,8)}`;
    console.error('google_oauth_callback_failed',reference,stage,error?.name||'Error',error?.message||String(error));
    return errorPage('O login Google encontrou um erro interno.',500,returnHost,reference);
  }
}
