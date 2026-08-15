import { json, normalizeEmail, randomToken, sessionCookie, sha256, verifyPassword, verifyTurnstile } from "./_lib.js";

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ ok: false, code: "DB_NOT_CONFIGURED" }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  if (!await verifyTurnstile(context.env, context.request, body.turnstileToken)) {
    return json({ ok: false, message: "Confirme que você não é um robô." }, 400);
  }
  const email = normalizeEmail(body.email);
  const row = await context.env.DB.prepare(`SELECT id,company_id,name,email,password_hash,password_salt,password_iterations,role,active
    FROM platform_users WHERE email=?1 LIMIT 1`).bind(email).first();
  const valid = row && row.active && await verifyPassword(String(body.password || ""), row.password_hash, row.password_salt, row.password_iterations);
  if (!valid) return json({ ok: false, message: "E-mail ou senha inválidos." }, 401);
  const raw = randomToken(32);
  const now = new Date().toISOString();
  await context.env.DB.prepare(`INSERT INTO platform_sessions
    (id,user_id,company_id,token_hash,expires_at,created_at,last_seen_at)
    VALUES (?1,?2,?3,?4,?5,?6,?6)`)
    .bind(`session-${crypto.randomUUID()}`, row.id, row.company_id, await sha256(raw), new Date(Date.now()+28800000).toISOString(), now).run();
  return json({ ok: true, redirect: "/platform-admin/" }, 200, { "set-cookie": sessionCookie(raw) });
}


