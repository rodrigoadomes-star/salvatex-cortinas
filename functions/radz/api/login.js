import {
  createSession,
  createStoredAdminSession,
  json,
  secureEqual,
  sessionCookie,
  auditRadz,
  resolvePlatformRoles,
} from "./_auth.js";
import { normalizeEmail, sha256, verifyPassword } from "../../platform/api/_lib.js";

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

async function attemptKeys(context, email) {
  const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";
  const salt = context.env.PLATFORM_AUDIT_SALT || "radzhub";
  return {
    identifierHash: await sha256(`radz-login:${normalizeEmail(email || "legacy")}`),
    ipHash: await sha256(`${ip}:${salt}`),
  };
}

async function tooManyAttempts(context, identifierHash, ipHash) {
  try {
    const row = await context.env.DB.prepare(`SELECT COUNT(*) failures
      FROM platform_auth_attempts
      WHERE scope='radz_admin'
        AND success=0
        AND created_at >= datetime('now', ?1)
        AND (identifier_hash=?2 OR ip_hash=?3)`)
      .bind(`-${WINDOW_MINUTES} minutes`, identifierHash, ipHash)
      .first();
    return Number(row?.failures || 0) >= MAX_ATTEMPTS;
  } catch { return false; }
}

async function recordAttempt(context, identifierHash, ipHash, success) {
  try {
    await context.env.DB.prepare(`INSERT INTO platform_auth_attempts
      (scope,identifier_hash,ip_hash,success,created_at)
      VALUES ('radz_admin',?1,?2,?3,?4)`)
      .bind(identifierHash, ipHash, success ? 1 : 0, new Date().toISOString())
      .run();
  } catch {}
}

function primaryRole(roles, fallback) {
  for (const role of ["platform_owner", "platform_support", "platform_finance"]) {
    if (roles.includes(role)) return role;
  }
  return fallback;
}

export async function onRequestPost(context) {
  const origin = context.request.headers.get("origin");
  if (origin && origin !== new URL(context.request.url).origin) return json({ ok: false, message: "Origem não autorizada." }, 403);
  if (Number(context.request.headers.get("content-length") || 0) > 8192) return json({ ok: false, message: "Requisição muito grande." }, 413);
  if (!context.env.DB) return json({ ok: false, message: "Banco da plataforma não configurado." }, 503);

  let body = {};
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "JSON inválido." }, 400); }

  const email = normalizeEmail(body.email || "");
  const { identifierHash, ipHash } = await attemptKeys(context, email || "legacy");
  if (await tooManyAttempts(context, identifierHash, ipHash)) return json({ ok: false, code: "RATE_LIMITED", message: "Muitas tentativas. Aguarde alguns minutos." }, 429);

  if (email && body.password) {
    const user = await context.env.DB.prepare(`SELECT id,name,email,password_hash,password_salt,password_iterations,role,active
      FROM platform_users
      WHERE email=?1 AND company_id IS NULL AND role IN ('platform_owner','platform_support')
      LIMIT 1`).bind(email).first();

    const valid = Boolean(user?.active && await verifyPassword(String(body.password || ""), String(user?.password_hash || ""), String(user?.password_salt || ""), Number(user?.password_iterations || 210000)).catch(() => false));
    await recordAttempt(context, identifierHash, ipHash, valid);
    if (!valid) return json({ ok: false, message: "E-mail ou senha inválidos." }, 401);

    const roles = await resolvePlatformRoles(context.env.DB, user.id, user.role);
    if (!roles.length) return json({ ok: false, message: "Este usuário não possui papel ativo na plataforma." }, 403);
    const role = primaryRole(roles, user.role);
    const session = await createStoredAdminSession(context, user);
    const auth = { session: { user_id: user.id, role, roles } };
    await auditRadz(context, auth, "platform.admin.login", "platform_user", user.id, { method: "password", role });
    return json({
      ok: true,
      csrfToken: session.csrf,
      expiresAt: session.expiresAt,
      user: { id: user.id, name: user.name, email: user.email, role, roles },
      legacy: false,
    }, 200, { "set-cookie": sessionCookie(session.token) });
  }

  if (body.token && context.env.RADZ_ADMIN_TOKEN && context.env.RADZ_ADMIN_SESSION_SECRET) {
    const valid = await secureEqual(String(body.token || ""), String(context.env.RADZ_ADMIN_TOKEN));
    await recordAttempt(context, identifierHash, ipHash, valid);
    if (!valid) return json({ ok: false, message: "Credencial inválida." }, 401);
    const session = await createSession(String(context.env.RADZ_ADMIN_SESSION_SECRET));
    await auditRadz(context, { session: { user_id: null, role: "platform_owner", roles: ["platform_owner"] } }, "platform.admin.login", "legacy_admin", null, { method: "legacy_token" });
    return json({
      ok: true,
      csrfToken: session.csrf,
      expiresIn: 28800,
      user: { id: null, name: "Administrador RADZ HUB (chave mestra)", email: null, role: "platform_owner", roles: ["platform_owner"] },
      legacy: true,
    }, 200, { "set-cookie": sessionCookie(session.token) });
  }

  return json({ ok: false, message: "Informe e-mail e senha." }, 422);
}
