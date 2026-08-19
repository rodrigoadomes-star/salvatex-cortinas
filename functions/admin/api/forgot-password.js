import { json } from './_auth.js';
import { resolveStore } from './_tenant.js';
import { ensureAdminAuthSchema, ensureLegacySalvatexAdmin, ensurePlatformCompanyAdmin, normalizeEmail, validEmail, randomToken, sha256, sendResetEmail } from './_credentials.js';

const GENERIC='Se o e-mail estiver cadastrado, enviaremos um link de redefinição.';

export async function onRequestPost(context){
  const origin=context.request.headers.get('origin');
  if(origin&&origin!==new URL(context.request.url).origin)return json({ok:false,message:'Origem não autorizada.'},403);
  if(!context.env.DB)return json({ok:false,message:'Banco de dados não configurado.'},503);
  const store=await resolveStore(context);
  if(!store)return json({ok:false,message:'Empresa não identificada para este domínio.'},404);
  await ensureAdminAuthSchema(context.env.DB);
  await ensureLegacySalvatexAdmin(context.env.DB,store);
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const email=normalizeEmail(body.email);
  if(!validEmail(email))return json({ok:true,message:GENERIC});
  await ensurePlatformCompanyAdmin(context.env.DB,store,email);
  const user=await context.env.DB.prepare(`SELECT id,email,active FROM admin_users WHERE store_id=?1 AND email=?2 LIMIT 1`).bind(String(store.id),email).first();
  if(!user||Number(user.active)===0)return json({ok:true,message:GENERIC});

  const recent=await context.env.DB.prepare(`SELECT created_at FROM admin_password_resets WHERE user_id=?1 ORDER BY created_at DESC LIMIT 1`).bind(user.id).first();
  if(recent&&Date.now()-Date.parse(recent.created_at)<60000)return json({ok:true,message:GENERIC});

  const token=randomToken(32),tokenHash=await sha256(token),now=new Date(),expires=new Date(now.getTime()+20*60*1000);
  await context.env.DB.prepare(`UPDATE admin_password_resets SET used_at=?1 WHERE user_id=?2 AND used_at IS NULL`).bind(now.toISOString(),user.id).run();
  await context.env.DB.prepare(`INSERT INTO admin_password_resets(id,user_id,store_id,token_hash,expires_at,created_at) VALUES(?1,?2,?3,?4,?5,?6)`)
    .bind(crypto.randomUUID(),user.id,String(store.id),tokenHash,expires.toISOString(),now.toISOString()).run();

  const resetUrl=`${new URL(context.request.url).origin}/admin/reset-password.html?token=${encodeURIComponent(token)}`;
  try{await sendResetEmail(context.env,{to:user.email,storeName:store.name,resetUrl});}
  catch(error){console.error('ADMIN_RESET_EMAIL_FAILED',error);return json({ok:false,message:'Não foi possível enviar o e-mail de recuperação agora.'},503)}
  return json({ok:true,message:GENERIC});
}
