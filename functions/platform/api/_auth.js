import { cookie, json, sha256 } from "./_lib.js";

export async function requirePlatformSession(context, roles = []) {
  if (!context.env.DB) return { ok: false, response: json({ ok: false, code: "DB_NOT_CONFIGURED" }, 503) };
  const raw = cookie(context.request, "radzhub_session");
  if (!raw) return { ok: false, response: json({ ok: false, code: "UNAUTHORIZED" }, 401) };
  const tokenHash = await sha256(raw);
  const row = await context.env.DB.prepare(`SELECT s.id session_id, s.company_id, s.expires_at,
      u.id user_id, u.name, u.email, u.role, u.active,
      c.trade_name, c.slug, c.status company_status, c.plan_code
    FROM platform_sessions s
    JOIN platform_users u ON u.id = s.user_id
    LEFT JOIN platform_companies c ON c.id = s.company_id
    WHERE s.token_hash = ?1 LIMIT 1`).bind(tokenHash).first();
  if (!row || !row.active || Date.parse(row.expires_at) <= Date.now()) {
    return { ok: false, response: json({ ok: false, code: "SESSION_EXPIRED" }, 401) };
  }
  if (roles.length && !roles.includes(row.role)) {
    return { ok: false, response: json({ ok: false, code: "FORBIDDEN" }, 403) };
  }
  await context.env.DB.prepare("UPDATE platform_sessions SET last_seen_at = ?1 WHERE id = ?2")
    .bind(new Date().toISOString(), row.session_id).run();
  return { ok: true, session: row };
}


