import { json } from './_auth.js';
import { resolveStore } from './_tenant.js';
import { ensureAdminAuthSchema, sha256, hashPassword } from './_credentials.js';

export async function onRequestPost(context){
  try{
    const origin=context.request.headers.get('origin');
    if(origin&&origin!==new URL(context.request.url).origin)return json({ok:false,message:'Origem não autorizada.'},403);
    if(!context.env.DB)return json({ok:false,message:'Banco de dados não configurado.'},503);
    const store=await resolveStore(context);
    if(!store)return json({ok:false,message:'Empresa não identificada para este domínio.'},404);
    await ensureAdminAuthSchema(context.env.DB);
    let body={};try{body=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
    const token=String(body.token||'').trim(),password=String(body.password||'');
    if(token.length<32)return json({ok:false,message:'Link de redefinição inválido.'},400);
    if(password.length<10)return json({ok:false,message:'A nova senha deve ter pelo menos 10 caracteres.'},400);
    if(password.length>200)return json({ok:false,message:'Senha muito longa.'},400);
    const tokenHash=await sha256(token),now=new Date().toISOString();
    const reset=await context.env.DB.prepare(`SELECT r.id,r.user_id,r.store_id,r.expires_at,r.used_at,u.active
      FROM admin_password_resets r JOIN admin_users u ON u.id=r.user_id
      WHERE r.token_hash=?1 AND r.store_id=?2 LIMIT 1`).bind(tokenHash,String(store.id)).first();
    if(!reset||reset.used_at||Number(reset.active)===0||Date.parse(reset.expires_at)<=Date.now())return json({ok:false,message:'Este link é inválido ou expirou.'},400);
    const credential=await hashPassword(password);
    const updated=await context.env.DB.prepare(`UPDATE admin_users SET password_hash=?1,password_salt=?2,password_iterations=?3,session_version=COALESCE(session_version,1)+1,updated_at=?4 WHERE id=?5 AND store_id=?6`)
      .bind(credential.hash,credential.salt,credential.iterations,now,reset.user_id,String(store.id)).run();
    if(!updated?.meta?.changes)return json({ok:false,message:'Não foi possível atualizar o usuário administrativo.'},409);
    await context.env.DB.prepare(`UPDATE admin_password_resets SET used_at=?1 WHERE user_id=?2 AND store_id=?3 AND used_at IS NULL`).bind(now,reset.user_id,String(store.id)).run();
    return json({ok:true,message:'Senha criada com sucesso. Você já pode entrar no painel.'});
  }catch(error){
    console.error('ADMIN_RESET_PASSWORD_FAILED',error);
    const message=String(error?.message||'');
    if(message.includes('CPU time')||message.includes('resource limits'))return json({ok:false,message:'A redefinição excedeu o limite de processamento. Tente novamente após a atualização.'},503);
    return json({ok:false,message:'Não foi possível redefinir a senha. Gere um novo link e tente novamente.'},500);
  }
}
