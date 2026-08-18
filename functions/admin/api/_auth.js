import { resolveStore, requestHost } from './_tenant.js';

const encoder = new TextEncoder();
const ADMIN_COOKIE = "__Host-stx_admin";
const SESSION_SECONDS = 8 * 60 * 60;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff", ...headers
    }
  });
}

function b64u(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function fromB64u(value){let s=value.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function cookie(request,name){for(const part of(request.headers.get("cookie")||"").split(";")){const[k,...v]=part.trim().split("=");if(k===name)return decodeURIComponent(v.join("="))}return""}
async function hmacKey(secret){return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"])}
async function digest(value){return new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value)))}
export async function secureEqual(a,b){const da=await digest(String(a)),db=await digest(String(b));if(da.length!==db.length)return false;let diff=0;for(let i=0;i<da.length;i++)diff|=da[i]^db[i];return diff===0}
export async function createAdminSession(secret, store){const csrf=b64u(crypto.getRandomValues(new Uint8Array(24)));const payload=b64u(encoder.encode(JSON.stringify({iat:Date.now(),exp:Date.now()+SESSION_SECONDS*1000,csrf,nonce:crypto.randomUUID(),storeId:store.id,host:store.host})));const signature=b64u(new Uint8Array(await crypto.subtle.sign("HMAC",await hmacKey(secret),encoder.encode(payload))));return{token:`${payload}.${signature}`,csrf}}
export function adminCookie(token){return`${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`}
export function clearAdminCookie(){return`${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}
async function readAdminSession(context){const secret=String(context.env.ADMIN_SESSION_SECRET||"").trim(),token=cookie(context.request,ADMIN_COOKIE);if(!secret||!token)return null;const[body,sig]=token.split(".");if(!body||!sig)return null;try{const valid=await crypto.subtle.verify("HMAC",await hmacKey(secret),fromB64u(sig),encoder.encode(body));if(!valid)return null;const data=JSON.parse(new TextDecoder().decode(fromB64u(body)));return Number(data.exp)>Date.now()&&data.csrf?data:null}catch{return null}}
export async function requireAdmin(context){if(!context.env.ADMIN_SESSION_SECRET||!context.env.ADMIN_TOKEN)return{ok:false,response:json({ok:false,code:"ADMIN_NOT_CONFIGURED",message:"Configure ADMIN_TOKEN e ADMIN_SESSION_SECRET como secrets no Cloudflare."},503)};const store=await resolveStore(context);if(!store)return{ok:false,response:json({ok:false,code:"STORE_NOT_FOUND",message:"Empresa não identificada para este domínio."},404)};const session=await readAdminSession(context);if(!session||session.storeId!==store.id||session.host!==requestHost(context.request))return{ok:false,response:json({ok:false,code:"UNAUTHORIZED",message:"Sessão administrativa inválida ou expirada."},401)};const method=context.request.method.toUpperCase();if(!["GET","HEAD","OPTIONS"].includes(method)){const origin=context.request.headers.get("origin");if(origin&&origin!==new URL(context.request.url).origin)return{ok:false,response:json({ok:false,code:"BAD_ORIGIN",message:"Origem não autorizada."},403)};if(!await secureEqual(context.request.headers.get("x-csrf-token")||"",session.csrf))return{ok:false,response:json({ok:false,code:"CSRF",message:"Validação CSRF falhou."},403)}}if(!context.env.DB)return{ok:false,response:json({ok:false,code:"DB_NOT_CONFIGURED",message:"Binding D1 DB não configurado."},503)};return{ok:true,session,store,storeId:store.id}}

export function clean(value, max = 500) {
  return String(value ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}
export function sanitizeHtml(value,max=50000){return clean(value,max).replace(/<(script|style|iframe|object|embed|form|meta|link)[^>]*>[\s\S]*?<\/\1\s*>/gi,"").replace(/<(script|style|iframe|object|embed|form|meta|link)\b[^>]*\/?\s*>/gi,"").replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,"").replace(/\s+(href|src)\s*=\s*(["'])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi,' $1="#"')}

export function slugify(value) {
  return clean(value, 240).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function cents(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function parseJson(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

export async function logAdmin(db, action, entityType = null, entityId = null, payload = null, storeId = 'salvatex') {
  try {
    await db.prepare(`INSERT INTO admin_logs (store_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
      .bind(storeId, action, entityType, entityId, payload ? JSON.stringify(payload) : null, new Date().toISOString()).run();
  } catch (_) {}
}
