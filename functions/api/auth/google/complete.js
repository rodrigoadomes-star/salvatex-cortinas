import {json} from '../../_lib.js';
import {requirePublicStore} from '../../_tenant.js';
import {signSession,sessionCookie} from '../../_customer-auth.js';
import {hasMembership} from '../_tenant-account.js';
import {safeReturnPath} from '../_google-oauth.js';
const enc=new TextEncoder();
async function sha(value){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(value||''))));return [...d].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:'Banco indisponível.'},503);
  const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;
  const code=new URL(context.request.url).searchParams.get('code')||'';if(code.length<20)return json({ok:false,message:'Código de autenticação inválido.'},400);
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_oauth_exchanges(code_hash TEXT PRIMARY KEY,store_id TEXT NOT NULL,account_id TEXT NOT NULL,return_to TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`).run();
  const hash=await sha(code),row=await context.env.DB.prepare(`SELECT * FROM customer_oauth_exchanges WHERE code_hash=?1 AND store_id=?2 LIMIT 1`).bind(hash,tenant.storeId).first();
  if(!row||Date.parse(row.expires_at)<=Date.now())return json({ok:false,message:'Este acesso expirou. Tente entrar com Google novamente.'},401);
  const member=await hasMembership(context.env.DB,tenant.storeId,row.account_id);if(!member)return json({ok:false,message:'Conta não vinculada a esta loja.'},403);
  const account=await context.env.DB.prepare(`SELECT id,email,name,picture,provider,email_verified,active,session_version FROM customer_accounts WHERE id=?1 LIMIT 1`).bind(row.account_id).first();
  if(!account||Number(account.active)===0)return json({ok:false,message:'Conta indisponível.'},401);
  await context.env.DB.prepare('DELETE FROM customer_oauth_exchanges WHERE code_hash=?1').bind(hash).run();
  const user={sub:account.id,userId:account.id,email:account.email,name:account.name,picture:account.picture||'',provider:account.provider||'google',emailVerified:Boolean(account.email_verified),sessionVersion:Number(account.session_version||1),storeId:tenant.storeId};
  const token=await signSession(context,user),returnTo=safeReturnPath(row.return_to);
  return new Response(null,{status:302,headers:{location:returnTo,'set-cookie':sessionCookie(token),'cache-control':'no-store'}});
}
