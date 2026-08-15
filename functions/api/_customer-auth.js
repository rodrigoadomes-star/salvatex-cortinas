import { json } from "./_lib.js";
const enc=new TextEncoder();
function b64u(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function b64uText(s){return b64u(enc.encode(s))}
function fromB64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function cookie(req,name){const str=req.headers.get('cookie')||'';for(const part of str.split(';')){const [k,...v]=part.trim().split('=');if(k===name)return decodeURIComponent(v.join('='))}return ''}
async function key(secret){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function signSession(context,user){const secret=String(context.env.CUSTOMER_SESSION_SECRET||'');if(secret.length<32)throw new Error('CUSTOMER_SESSION_SECRET inválido.');const payload={sub:user.sub,userId:user.userId||user.sub,email:user.email,name:user.name||'',picture:user.picture||'',provider:user.provider||'google',emailVerified:user.emailVerified!==false,iat:Date.now(),exp:Date.now()+12*60*60*1000,nonce:crypto.randomUUID()};const body=b64uText(JSON.stringify(payload));const sig=new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),enc.encode(body)));return body+'.'+b64u(sig)}
export async function readSession(context){const token=cookie(context.request,'__Host-stx_customer');if(!token)return null;const secret=String(context.env.CUSTOMER_SESSION_SECRET||'');if(!secret)return null;const [body,sig]=token.split('.');if(!body||!sig)return null;const ok=await crypto.subtle.verify('HMAC',await key(secret),fromB64u(sig),enc.encode(body));if(!ok)return null;try{const p=JSON.parse(new TextDecoder().decode(fromB64u(body)));if(Date.now()>Number(p.exp||0))return null;return p}catch{return null}}
export function sessionCookie(token){return `__Host-stx_customer=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${12*60*60}`}
export function clearCookie(){return '__Host-stx_customer=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}
export async function requireCustomer(context){const user=await readSession(context);if(!user)return{ok:false,response:json({ok:false,message:'Faça login para acessar sua conta.'},401)};return{ok:true,user}}
export function decodeJwtPart(s){try{return JSON.parse(new TextDecoder().decode(fromB64u(s)))}catch{return null}}
export function base64urlBytes(s){return fromB64u(s)}

