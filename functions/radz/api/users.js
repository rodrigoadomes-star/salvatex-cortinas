import { auditRadz, json, requireRadzAdmin, resolvePlatformRoles } from "./_auth.js";
import { clean, nowIso } from "./_policy.js";
import { hashPassword, normalizeEmail, validEmail } from "../../platform/api/_lib.js";

const ROLES = ["platform_owner", "platform_support", "platform_finance"];

function baseRoleFor(role) {
  return role === "platform_owner" ? "platform_owner" : "platform_support";
}

async function roleTableReady(db) {
  try {
    const row = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_user_roles' LIMIT 1").first();
    return Boolean(row);
  } catch { return false; }
}

async function effectiveRole(db, user) {
  const roles = await resolvePlatformRoles(db, user.id, user.role);
  return roles.includes("platform_owner") ? "platform_owner" : roles.includes("platform_support") ? "platform_support" : roles.includes("platform_finance") ? "platform_finance" : user.role;
}

async function countOtherOwners(db, id) {
  if (await roleTableReady(db)) {
    const row = await db.prepare(`SELECT COUNT(DISTINCT u.id) total
      FROM platform_users u
      JOIN platform_user_roles ur ON ur.user_id=u.id AND ur.company_id IS NULL
      WHERE u.company_id IS NULL AND u.active=1 AND u.id<>?1
        AND ur.role_code='platform_owner' AND ur.active=1
        AND (ur.expires_at IS NULL OR ur.expires_at>datetime('now'))`).bind(id).first();
    return Number(row?.total || 0);
  }
  const row = await db.prepare(`SELECT COUNT(*) total FROM platform_users
    WHERE company_id IS NULL AND role='platform_owner' AND active=1 AND id<>?1`).bind(id).first();
  return Number(row?.total || 0);
}

async function roleAssignmentStatement(db, id, role, active, actorId, now) {
  return db.prepare(`INSERT INTO platform_user_roles
    (id,user_id,company_id,role_code,active,assigned_by_user_id,expires_at,created_at,updated_at)
    VALUES(?1,?2,NULL,?3,?4,?5,NULL,?6,?6)
    ON CONFLICT(user_id,COALESCE(company_id,''),role_code) DO UPDATE SET
      active=excluded.active,assigned_by_user_id=excluded.assigned_by_user_id,expires_at=NULL,updated_at=excluded.updated_at`)
    .bind(`role-${id}-${role}`, id, role, active, actorId || null, now);
}

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  const result = await context.env.DB.prepare(`SELECT id,name,email,role,email_verified_at,active,created_at,updated_at
    FROM platform_users
    WHERE company_id IS NULL AND role IN ('platform_owner','platform_support')
    ORDER BY active DESC,role,name`).all();
  const users = [];
  for (const user of result.results || []) {
    users.push({ ...user, baseRole: user.role, role: await effectiveRole(context.env.DB, user) });
  }
  return json({ ok: true, users });
}

export async function onRequestPost(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  const name = clean(body.name, 160);
  const email = normalizeEmail(body.email || "");
  const role = ROLES.includes(body.role) ? body.role : "platform_support";
  const password = String(body.password || "");
  if (!name || !validEmail(email) || password.length < 12) {
    return json({ ok: false, message: "Informe nome, e-mail válido e senha com pelo menos 12 caracteres." }, 422);
  }
  const exists = await context.env.DB.prepare("SELECT id FROM platform_users WHERE email=?1").bind(email).first();
  if (exists) return json({ ok: false, message: "Este e-mail já está cadastrado." }, 409);
  const rolesReady = await roleTableReady(context.env.DB);
  if (role === "platform_finance" && !rolesReady) {
    return json({ ok: false, code: "MIGRATION_REQUIRED", message: "A migration RBAC precisa ser aplicada antes de criar um usuário Financeiro." }, 409);
  }
  const passwordData = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = nowIso();
  const baseRole = baseRoleFor(role);
  const statements = [context.env.DB.prepare(`INSERT INTO platform_users
    (id,company_id,name,email,password_hash,password_salt,password_iterations,role,email_verified_at,active,created_at,updated_at)
    VALUES (?1,NULL,?2,?3,?4,?5,?6,?7,?8,1,?8,?8)`)
    .bind(id, name, email, passwordData.hash, passwordData.salt, passwordData.iterations, baseRole, now)];
  if (rolesReady) statements.push(await roleAssignmentStatement(context.env.DB, id, role, 1, auth.session.user_id, now));
  await context.env.DB.batch(statements);
  await auditRadz(context, auth, "platform.user.created", "platform_user", id, { name, email, role });
  return json({ ok: true, id, role }, 201);
}

export async function onRequestPatch(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  const id = clean(body.id, 100);
  const current = await context.env.DB.prepare(`SELECT id,name,email,role,active FROM platform_users
    WHERE id=?1 AND company_id IS NULL AND role IN ('platform_owner','platform_support')`).bind(id).first();
  if (!current) return json({ ok: false, message: "Usuário da plataforma não encontrado." }, 404);
  const currentRole = await effectiveRole(context.env.DB, current);
  const role = body.role == null ? currentRole : (ROLES.includes(body.role) ? body.role : null);
  if (!role) return json({ ok: false, message: "Papel inválido." }, 422);
  const active = body.active == null ? Number(current.active) : (body.active ? 1 : 0);
  if (id === auth.session.user_id && active === 0) return json({ ok: false, message: "Você não pode desativar sua própria conta durante a sessão." }, 409);
  if (currentRole === "platform_owner" && (role !== "platform_owner" || active === 0)) {
    if (await countOtherOwners(context.env.DB, id) < 1) return json({ ok: false, message: "A plataforma precisa manter pelo menos um Super Admin ativo." }, 409);
  }
  const rolesReady = await roleTableReady(context.env.DB);
  if (role === "platform_finance" && !rolesReady) {
    return json({ ok: false, code: "MIGRATION_REQUIRED", message: "A migration RBAC precisa ser aplicada antes de usar o papel Financeiro." }, 409);
  }
  const now = nowIso();
  const name = clean(body.name ?? current.name, 160);
  const email = normalizeEmail(body.email ?? current.email);
  if (!name || !validEmail(email)) return json({ ok: false, message: "Nome ou e-mail inválido." }, 422);

  const baseRole = baseRoleFor(role);
  const statements = [
    context.env.DB.prepare(`UPDATE platform_users SET name=?1,email=?2,role=?3,active=?4,updated_at=?5 WHERE id=?6`)
      .bind(name, email, baseRole, active, now, id),
  ];

  if (rolesReady) {
    statements.push(context.env.DB.prepare(`UPDATE platform_user_roles SET active=0,updated_at=?1
      WHERE user_id=?2 AND company_id IS NULL AND role_code IN ('platform_owner','platform_support','platform_finance')`).bind(now, id));
    statements.push(await roleAssignmentStatement(context.env.DB, id, role, active, auth.session.user_id, now));
  }

  if (body.password) {
    const password = String(body.password);
    if (password.length < 12) return json({ ok: false, message: "A nova senha deve possuir pelo menos 12 caracteres." }, 422);
    const passwordData = await hashPassword(password);
    statements.push(context.env.DB.prepare(`UPDATE platform_users SET password_hash=?1,password_salt=?2,password_iterations=?3,updated_at=?4 WHERE id=?5`)
      .bind(passwordData.hash, passwordData.salt, passwordData.iterations, now, id));
    statements.push(context.env.DB.prepare("DELETE FROM platform_sessions WHERE user_id=?1").bind(id));
  }
  await context.env.DB.batch(statements);
  await auditRadz(context, auth, "platform.user.updated", "platform_user", id, { before: { role: currentRole, active: Boolean(current.active) }, after: { role, active: Boolean(active) }, passwordReset: Boolean(body.password) });
  return json({ ok: true, role });
}
