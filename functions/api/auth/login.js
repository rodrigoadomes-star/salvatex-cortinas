import {json} from '../_lib.js';
import {sameOrigin,bodyWithin,requireTurnstile} from '../_security.js';
import {signSession,sessionCookie} from '../_customer-auth.js';
import {normalizeEmail,validEmail,verifyPassword,hashIdentifier} from './_password.js';
import {customerTenant,ensureMembership} from './_tenant-account.js';
const generic=()=>json({ok:false,message:'E-mail ou senha inválidos.'},401);
export async function onRequestPost(context){
  if(!sameOrigin(context))return json({ok:false,message:'Origem não autorizada.'},403);
  if(!bodyWithin(context,8192))return json({ok:false,message:'Dados acima do limite.'},413);
  if(!context.env.DB)return json({ok:false,message:'Banco indisponível.'},503);
  const tenant=await customerTenant(context,json);if(!tenant.ok)return tenant.response;
  let b={};try{b=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const turnstile=await requireTurnstile(context,b.turnstileToken);if(!turnstile.ok)return turnstile.response;
  const email=normalizeEmail(b.email),password=String(b.password||'');if(!validEmail(email)||password.length>128)return generic();
  const ipKey=await hashIdentifier(context.request.headers.get('cf-connecting-ip')||'unknown'),cutoff=new Date(Date.now()-15*60*1000).toISOString();
  const attempts=await context.env.DB.prepare('SELECT COUNT(*) n FROM customer_login_attempts WHERE key_hash=?1 AND created_at>?2').bind(ipKey,cutoff).first();if(Number(attempts?.n||0)>=12)return json({ok:false,message:'Muitas tentativas. Aguarde alguns minutos.'},429);
  const row=await context.env.DB.prepare('SELECT * FROM customer_accounts WHERE email=?1 AND active=1').bind(email).first();
  const valid=row&&row.password_hash?await verifyPassword(password,row):false;
  if(!valid){await context.env.DB.prepare('INSERT INTO customer_login_attempts(key_hash,created_at) VALUES(?1,?2)').bind(ipKey,new Date().toISOString()).run();return generic()}
  await ensureMembership(context.env.DB,tenant.storeId,row.id);
  await context.env.DB.prepare('DELETE FROM customer_login_attempts WHERE key_hash=?1').bind(ipKey).run();
  const user={sub:row.id,userId:row.id,email:row.email,name:row.name,provider:row.provider,emailVerified:Boolean(row.email_verified),storeId:tenant.storeId};
  const token=await signSession(context,user);
  return json({ok:true,user},200,{'Set-Cookie':sessionCookie(token)});
}
