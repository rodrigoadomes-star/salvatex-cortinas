import {adminCookie,createAdminSession,json} from "./_auth.js";
import {resolveStore} from './_tenant.js';
import {ensureAdminAuthSchema,ensureLegacySalvatexAdmin,ensurePlatformCompanyAdmin,normalizeEmail,verifyPassword} from './_credentials.js';

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
  const user=await context.env.DB.prepare(`SELECT id,email,password_hash,password_salt,password_iterations,active,session_version FROM admin_users WHERE store_id=?1 AND email=?2 LIMIT 1`).bind(String(store.id),email).first();
  if(!user||Number(user.active)===0||!user.password_hash)return json({ok:false,message:"E-mail ou senha inválidos. Se for o primeiro acesso, use 'Esqueci minha senha'."},401);
  const valid=await verifyPassword(password,user.password_hash,user.password_salt,user.password_iterations);
  if(!valid)return json({ok:false,message:"E-mail ou senha inválidos."},401);
  const session=await createAdminSession(String(context.env.ADMIN_SESSION_SECRET),store,user);
  return json({ok:true,csrfToken:session.csrf,expiresIn:28800,store:{id:store.id,slug:store.slug,name:store.name},user:{id:user.id,email:user.email}},200,{"set-cookie":adminCookie(session.token)});
}
