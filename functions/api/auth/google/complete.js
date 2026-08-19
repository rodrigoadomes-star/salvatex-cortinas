import {json} from '../../_lib.js';
import {requirePublicStore} from '../../_tenant.js';
import {signSession,sessionCookie} from '../../_customer-auth.js';
import {hasMembership} from '../_tenant-account.js';
import {safeReturnPath} from '../_google-oauth.js';
const enc=new TextEncoder();
async function sha(value){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(value||''))));return [...d].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function tableColumns(db,table){const r=await db.prepare(`PRAGMA table_info(${table})`).all();return new Set((r.results||[]).map(c=>String(c.name)))}
async function ensureCompleteSchema(db){
  const accountCols=await tableColumns(db,'customer_accounts');
  const addAccount=async(name,sql)=>{if(!accountCols.has(name)){await db.prepare(`ALTER TABLE customer_accounts ADD COLUMN ${name} ${sql}`).run();accountCols.add(name)}};
  await addAccount('picture','TEXT');await addAccount('provider',"TEXT DEFAULT 'password'");await addAccount('email_verified','INTEGER DEFAULT 0');await addAccount('active','INTEGER DEFAULT 1');await addAccount('session_version','INTEGER DEFAULT 1');
  await db.prepare(`CREATE TABLE IF NOT EXISTS customer_oauth_exchanges(code_hash TEXT PRIMARY KEY,store_id TEXT NOT NULL,account_id TEXT NOT NULL,return_to TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`).run();
  const exchangeCols=await tableColumns(db,'customer_oauth_exchanges');
  const addExchange=async(name,sql)=>{if(!exchangeCols.has(name)){await db.prepare(`ALTER TABLE customer_oauth_exchanges ADD COLUMN ${name} ${sql}`).run();exchangeCols.add(name)}};
  await addExchange('store_id','TEXT');await addExchange('account_id','TEXT');await addExchange('return_to',"TEXT DEFAULT '/minha-conta.html'");await addExchange('expires_at','TEXT');await addExchange('created_at','TEXT');
}
export async function onRequestGet(context){
  try{
    if(!context.env.DB)return json({ok:false,message:'Banco indisponível.'},503);
    const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;
    const code=new URL(context.request.url).searchParams.get('code')||'';if(code.length<20)return json({ok:false,message:'Código de autenticação inválido.'},400);
    await ensureCompleteSchema(context.env.DB);
    const hash=await sha(code),row=await context.env.DB.prepare(`SELECT * FROM customer_oauth_exchanges WHERE code_hash=?1 AND store_id=?2 LIMIT 1`).bind(hash,tenant.storeId).first();
    if(!row||!row.expires_at||Date.parse(row.expires_at)<=Date.now())return json({ok:false,message:'Este acesso expirou. Tente entrar com Google novamente.'},401);
    const member=await hasMembership(context.env.DB,tenant.storeId,row.account_id);if(!member)return json({ok:false,message:'Conta não vinculada a esta loja.'},403);
    const account=await context.env.DB.prepare(`SELECT id,email,name,picture,provider,email_verified,active,session_version FROM customer_accounts WHERE id=?1 LIMIT 1`).bind(row.account_id).first();
    if(!account||Number(account.active)===0)return json({ok:false,message:'Conta indisponível.'},401);
    await context.env.DB.prepare('DELETE FROM customer_oauth_exchanges WHERE code_hash=?1').bind(hash).run();
    const user={sub:account.id,userId:account.id,email:account.email,name:account.name,picture:account.picture||'',provider:account.provider||'google',emailVerified:Boolean(account.email_verified),sessionVersion:Number(account.session_version||1),storeId:tenant.storeId};
    const token=await signSession(context,user),returnTo=safeReturnPath(row.return_to);
    return new Response(null,{status:302,headers:{location:returnTo,'set-cookie':sessionCookie(token),'cache-control':'no-store'}});
  }catch(error){
    const reference=`GOOGLE_COMPLETE_${crypto.randomUUID().slice(0,8)}`;
    console.error('google_oauth_complete_failed',reference,error?.name||'Error',error?.message||String(error));
    return json({ok:false,message:'Não foi possível concluir o login com Google.',reference},500);
  }
}
