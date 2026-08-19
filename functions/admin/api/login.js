import {adminCookie,createAdminSession,json} from "./_auth.js";
import {resolveStore} from './_tenant.js';
import {ensureAdminAuthSchema,ensureLegacySalvatexAdmin,ensurePlatformCompanyAdmin,normalizeEmail,verifyPassword} from './_credentials.js';

async function platformCredential(db,storeId,email){
  try{
    return await db.prepare(`SELECT u.password_hash,u.password_salt,u.password_iterations,u.active
      FROM platform_company_stores pcs
      JOIN platform_users u ON u.company_id=pcs.company_id
      WHERE pcs.store_id=?1 AND lower(u.email)=?2 AND u.active=1
      ORDER BY CASE WHEN u.role='owner' THEN 0 ELSE 1 END,u.created_at ASC
      LIMIT 1`).bind(String(storeId),email).first();
  }catch{return null}
}

export async function onRequestPost(context){
  const origin=context.request.headers.get("origin");
  if(origin&&origin!==new URL(context.request.url).origin)return json({ok:false,message:"Origem não autorizada."},403);
  if(Number(context.request.headers.get("content-length")||0)>8192)return json({ok:false,message:"Requisição muito grande."},413);
  if(!context.env.ADMIN_SESSION_SECRET)return json({ok:false,message:"Admin não configurado."},503);
  if(!context.env.DB)return json({ok:false,message:"Banco de dados não configurado."},503);
  const store=await resolveStore(context);
  if(!store)return json({ok:false,message:"Empresa não identificada para este domínio."},404);
  await ensureAdminAuthSchema(context.env.DB);
  await ensureLegacySalvatexAdmin(context.env.DB,store);
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:"JSON inválido."},400)}
  const email=normalizeEmail(body.email),password=String(body.password||'');
  await ensurePlatformCompanyAdmin(context.env.DB,store,email);
  let user=await context.env.DB.prepare(`SELECT id,email,password_hash,password_salt,password_iterations,active,session_version FROM admin_users WHERE store_id=?1 AND email=?2 LIMIT 1`).bind(String(store.id),email).first();
  if(!user||Number(user.active)===0)return json({ok:false,message:"E-mail ou senha inválidos. Se for o primeiro acesso, use 'Esqueci minha senha'."},401);

  let valid=false;
  if(user.password_hash)valid=await verifyPassword(password,user.password_hash,user.password_salt,user.password_iterations);

  // Usuários criados pelo cadastro da RADZ HUB usam a credencial de platform_users.
  // Se a cópia local do admin estiver vazia ou desatualizada, validamos a credencial
  // canônica da plataforma e sincronizamos somente quando ela for confirmada.
  if(!valid){
    const platform=await platformCredential(context.env.DB,store.id,email);
    if(platform?.password_hash&&Number(platform.active)!==0){
      const platformValid=await verifyPassword(password,platform.password_hash,platform.password_salt,platform.password_iterations);
      if(platformValid){
        const now=new Date().toISOString();
        await context.env.DB.prepare(`UPDATE admin_users SET password_hash=?1,password_salt=?2,password_iterations=?3,active=1,updated_at=?4 WHERE id=?5 AND store_id=?6`)
          .bind(platform.password_hash,platform.password_salt,platform.password_iterations,now,user.id,String(store.id)).run();
        user={...user,password_hash:platform.password_hash,password_salt:platform.password_salt,password_iterations:platform.password_iterations};
        valid=true;
      }
    }
  }

  if(!valid)return json({ok:false,message:"E-mail ou senha inválidos."},401);
  const session=await createAdminSession(String(context.env.ADMIN_SESSION_SECRET),store,user);
  return json({ok:true,csrfToken:session.csrf,expiresIn:28800,store:{id:store.id,slug:store.slug,name:store.name},user:{id:user.id,email:user.email}},200,{"set-cookie":adminCookie(session.token)});
}
