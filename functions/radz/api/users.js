import { auditRadz, json, requireRadzAdmin } from "./_auth.js";
import { clean, nowIso } from "./_policy.js";
import { hashPassword, normalizeEmail, validEmail } from "../../platform/api/_lib.js";

const ROLES = ["platform_owner", "platform_support"];

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  const result = await context.env.DB.prepare(`SELECT id,name,email,role,email_verified_at,active,created_at,updated_at
    FROM platform_users
    WHERE company_id IS NULL AND role IN ('platform_owner','platform_support')
    ORDER BY active DESC,role,name`).all();
  return json({ ok: true, users: result.results || [] });
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
  const passwordData = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = nowIso();
  await context.env.DB.prepare(`INSERT INTO platform_users
    (id,company_id,name,email,password_hash,password_salt,password_iterations,role,email_verified_at,active,created_at,updated_at)
    VALUES (?1,NULL,?2,?3,?4,?5,?6,?7,?8,1,?8,?8)`)
    .bind(id, name, email, passwordData.hash, passwordData.salt, passwordData.iterations, role, now)
    .run();
  await auditRadz(context, auth, "platform.user.created", "platform_user", id, { name, email, role });
  return json({ ok: true, id }, 201);
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
  const role = body.role == null ? current.role : (ROLES.includes(body.role) ? body.role : null);
  if (!role) return json({ ok: false, message: "Papel inválido." }, 422);
  const active = body.active == null ? Number(current.active) : (body.active ? 1 : 0);
  if (id === auth.session.user_id && active === 0) return json({ ok: false, message: "Você não pode desativar sua própria conta durante a sessão." }, 409);
  if (current.role === "platform_owner" && (role !== "platform_owner" || active === 0)) {
    const row = await context.env.DB.prepare(`SELECT COUNT(*) total FROM platform_users
      WHERE company_id IS NULL AND role='platform_owner' AND active=1 AND id<>?1`).bind(id).first();
    if (Number(row?.total || 0) < 1) return json({ ok: false, message: "A plataforma precisa manter pelo menos um Super Admin ativo." }, 409);
  }
  const now = nowIso();
  const name = clean(body.name ?? current.name, 160);
  const email = normalizeEmail(body.email ?? current.email);
  if (!name || !validEmail(email)) return json({ ok: false, message: "Nome ou e-mail inválido." }, 422);

  const statements = [
    context.env.DB.prepare(`UPDATE platform_users SET name=?1,email=?2,role=?3,active=?4,updated_at=?5 WHERE id=?6`)
      .bind(name, email, role, active, now, id),
  ];
  if (body.password) {
    const password = String(body.password);
    if (password.length < 12) return json({ ok: false, message: "A nova senha deve possuir pelo menos 12 caracteres." }, 422);
    const passwordData = await hashPassword(password);
    statements.push(context.env.DB.prepare(`UPDATE platform_users SET password_hash=?1,password_salt=?2,password_iterations=?3,updated_at=?4 WHERE id=?5`)
      .bind(passwordData.hash, passwordData.salt, passwordData.iterations, now, id));
    statements.push(context.env.DB.prepare("DELETE FROM platform_sessions WHERE user_id=?1").bind(id));
  }
  await context.env.DB.batch(statements);
  await auditRadz(context, auth, "platform.user.updated", "platform_user", id, { before: { role: current.role, active: Boolean(current.active) }, after: { role, active: Boolean(active) }, passwordReset: Boolean(body.password) });
  return json({ ok: true });
}
