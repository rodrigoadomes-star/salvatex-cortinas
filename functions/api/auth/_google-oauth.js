const enc=new TextEncoder();
function b64u(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function fromB64u(s){s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function key(secret){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
function parse(value,fallback={}){try{return JSON.parse(value||'{}')}catch{return fallback}}
export function googleRedirectUri(context){return String(context.env.GOOGLE_OAUTH_REDIRECT_URI||'https://radzhub.com.br/api/auth/google/callback').trim()}
export async function googleClientId(context,storeId=''){
  const direct=String(context.env.GOOGLE_OAUTH_CLIENT_ID||'').trim();if(direct)return direct;
  if(!context.env.DB)return'';
  try{
    if(storeId){const row=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key='marketing_config'`).bind(storeId).first();const id=String(parse(row?.value_json,{}).google?.clientId||'').trim();if(id)return id;}
    const row=await context.env.DB.prepare(`SELECT value_json FROM store_configs WHERE store_id='salvatex' AND config_key='marketing_config'`).first();return String(parse(row?.value_json,{}).google?.clientId||'').trim();
  }catch{return''}
}
export function googleClientSecret(context){return String(context.env.GOOGLE_OAUTH_CLIENT_SECRET||'').trim()}
export async function signGoogleState(context,payload){
  const secret=String(context.env.CUSTOMER_SESSION_SECRET||'').trim();if(secret.length<32)throw new Error('CUSTOMER_SESSION_SECRET inválido.');
  const body=b64u(enc.encode(JSON.stringify(payload))),sig=new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),enc.encode(body)));return body+'.'+b64u(sig);
}
export async function verifyGoogleState(context,state){
  try{const secret=String(context.env.CUSTOMER_SESSION_SECRET||'').trim(),[body,sig]=String(state||'').split('.');if(secret.length<32||!body||!sig)return null;const ok=await crypto.subtle.verify('HMAC',await key(secret),fromB64u(sig),enc.encode(body));if(!ok)return null;const data=JSON.parse(new TextDecoder().decode(fromB64u(body)));if(Number(data.exp||0)<Date.now())return null;return data;}catch{return null}
}
export function safeTenantHost(value){const host=String(value||'').toLowerCase().trim();return /^[a-z0-9-]+\.radzhub\.com\.br$/.test(host)&&!['www.radzhub.com.br','radz.radzhub.com.br','admin.radzhub.com.br','api.radzhub.com.br'].includes(host)?host:''}
export function safeReturnPath(value,fallback='/minha-conta.html'){const raw=String(value||'');return raw.startsWith('/')&&!raw.startsWith('//')&&!raw.includes('\\')?raw.slice(0,500):fallback}
