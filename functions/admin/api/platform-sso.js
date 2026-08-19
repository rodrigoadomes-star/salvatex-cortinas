import { adminCookie, createAdminSession, json } from './_auth.js';
import { resolveStore } from './_tenant.js';
import { ensureAdminAuthSchema, ensurePlatformCompanyAdmin } from './_credentials.js';
import { requirePlatformSession } from '../../platform/api/_auth.js';

export async function onRequestPost(context){
  if(!context.env.DB||!context.env.ADMIN_SESSION_SECRET)return json({ok:false,message:'Admin não configurado.'},503);
  const platform=await requirePlatformSession(context,['owner','admin']);if(!platform.ok)return platform.response;
  const store=await resolveStore(context);if(!store)return json({ok:false,message:'Empresa não identificada.'},404);
  const linked=await context.env.DB.prepare(`SELECT 1 ok FROM platform_company_stores WHERE company_id=?1 AND store_id=?2 LIMIT 1`).bind(platform.session.company_id,store.id).first();
  if(!linked)return json({ok:false,code:'TENANT_HOST_MISMATCH',message:'Esta sessão não pertence a esta empresa.'},403);
  await ensureAdminAuthSchema(context.env.DB);
  await ensurePlatformCompanyAdmin(context.env.DB,store,platform.session.email);
  const user=await context.env.DB.prepare(`SELECT id,email,active,session_version FROM admin_users WHERE store_id=?1 AND email=?2 LIMIT 1`).bind(store.id,String(platform.session.email).toLowerCase()).first();
  if(!user||Number(user.active)===0)return json({ok:false,message:'Usuário administrativo indisponível.'},403);
  const session=await createAdminSession(String(context.env.ADMIN_SESSION_SECRET),store,user);
  return json({ok:true,csrfToken:session.csrf,store,user:{id:user.id,email:user.email}},200,{"set-cookie":adminCookie(session.token)});
}
