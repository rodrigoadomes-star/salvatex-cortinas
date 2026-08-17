import { adminCookie, createAdminSession, json, sha256Hex } from "./_auth.js";
import { requireStoreTenant } from "../../_shared/tenant.js";
import { audit, normalizeEmail, verifyPassword, verifyTurnstile } from "../../platform/api/_lib.js";

export async function onRequestPost(context) {
  const origin = context.request.headers.get("origin");
  if (origin && origin !== new URL(context.request.url).origin) {
    return json({ ok: false, message: "Origem não autorizada." }, 403);
  }
  if (Number(context.request.headers.get("content-length") || 0) > 8192) {
    return json({ ok: false, message: "Requisição muito grande." }, 413);
  }
  if (!context.env.DB || !context.env.ADMIN_SESSION_SECRET) {
    return json({ ok: false, message: "Admin não configurado." }, 503);
  }

  const tenantResult = await requireStoreTenant(context, { allowPreview: true });
  if (!tenantResult.ok) return tenantResult.response;
  const tenant = tenantResult.tenant;
  if (!tenant.companyId) return json({ ok: false, message: "Empresa não identificada." }, 404);

  let body = {};
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "JSON inválido." }, 400); }

  if (!await verifyTurnstile(context.env, context.request, body.turnstileToken)) {
    return json({ ok: false, message: "Confirme que você não é um robô." }, 400);
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!email || !password) return json({ ok: false, message: "Informe e-mail e senha." }, 400);

  const user = await context.env.DB.prepare(`
    SELECT id, company_id, name, email, password_hash, password_salt, password_iterations, role, active
    FROM platform_users
    WHERE email=?1 AND company_id=?2
    LIMIT 1
  `).bind(email, tenant.companyId).first();

  const allowedRole = user && ["owner", "manager", "staff"].includes(user.role);
  const valid = user && user.active && allowedRole && await verifyPassword(password, user.password_hash, user.password_salt, user.password_iterations);
  if (!valid) {
    try { await audit(context.env, context.request, "admin_login_failed", tenant.companyId, user?.id || null, { email }); } catch (_) {}
    return json({ ok: false, message: "E-mail ou senha inválidos." }, 401);
  }

  const session = await createAdminSession(String(context.env.ADMIN_SESSION_SECRET), {
    userId: user.id,
    companyId: tenant.companyId,
    role: user.role
  });
  const now = new Date().toISOString();

  await context.env.DB.prepare(`
    INSERT INTO platform_sessions
      (id, user_id, company_id, token_hash, expires_at, created_at, last_seen_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
  `).bind(
    session.sessionId,
    user.id,
    tenant.companyId,
    await sha256Hex(session.platformToken),
    session.expiresAt,
    now
  ).run();

  try {
    await context.env.DB.prepare("DELETE FROM platform_sessions WHERE user_id=?1 AND expires_at<=?2")
      .bind(user.id, now).run();
  } catch (_) {}

  try { await audit(context.env, context.request, "admin_login_success", tenant.companyId, user.id, { store_id: tenant.storeId }); } catch (_) {}

  return json({
    ok: true,
    csrfToken: session.csrf,
    expiresIn: 28800,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    store: { id: tenant.storeId, companyId: tenant.companyId }
  }, 200, { "set-cookie": adminCookie(session.token) });
}
