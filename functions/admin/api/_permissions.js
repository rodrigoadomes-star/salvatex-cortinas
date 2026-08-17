import { json, requireAdmin } from './_auth.js';

const LEGACY_ROLE_MAP = {
  owner: 'company_admin',
  manager: 'company_manager',
  staff: 'company_support',
};

async function tableExists(db,name){
  try{
    const row=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1 LIMIT 1").bind(name).first();
    return Boolean(row);
  }catch{return false}
}

export async function hasCompanyPermission(db,auth,permission){
  if(!permission)return true;
  if(!db||!auth?.user?.id||!auth?.companyId)return false;

  // Compatibilidade: antes da migration RBAC, mantém o comportamento atual.
  if(!await tableExists(db,'platform_user_roles'))return true;

  const explicit=await db.prepare(`SELECT 1 allowed
    FROM platform_user_roles ur
    JOIN platform_roles r ON r.code=ur.role_code AND r.scope='company' AND r.active=1
    JOIN platform_role_permissions rp ON rp.role_code=ur.role_code
    WHERE ur.user_id=?1
      AND ur.company_id=?2
      AND ur.active=1
      AND (ur.expires_at IS NULL OR ur.expires_at>datetime('now'))
      AND rp.permission_code=?3
    LIMIT 1`)
    .bind(auth.user.id,auth.companyId,permission)
    .first();
  if(explicit?.allowed)return true;

  // Backward compatibility para usuário existente ainda não backfillado.
  const roleCode=LEGACY_ROLE_MAP[auth.user.role];
  if(!roleCode)return false;
  const legacy=await db.prepare(`SELECT 1 allowed
    FROM platform_role_permissions rp
    JOIN platform_roles r ON r.code=rp.role_code AND r.scope='company' AND r.active=1
    WHERE rp.role_code=?1 AND rp.permission_code=?2 LIMIT 1`)
    .bind(roleCode,permission).first();
  return Boolean(legacy?.allowed);
}

export async function requireAdminPermission(context,permission){
  const auth=await requireAdmin(context);
  if(!auth.ok)return auth;
  if(!await hasCompanyPermission(context.env.DB,auth,permission)){
    return {ok:false,response:json({ok:false,code:'FORBIDDEN',message:'Seu perfil não possui permissão para esta ação.'},403)};
  }
  return auth;
}
