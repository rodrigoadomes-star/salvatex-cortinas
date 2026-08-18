import { json, normalizeEmail, randomToken, sessionCookie, sha256, verifyPassword, verifyTurnstileDetailed } from "./_lib.js";

function turnstileFailure(result) {
  const configError = ["TURNSTILE_SECRET_MISSING", "TURNSTILE_SECRET_INVALID", "TURNSTILE_SITEVERIFY_UNAVAILABLE", "TURNSTILE_SITEVERIFY_HTTP", "TURNSTILE_SITEVERIFY_INVALID_RESPONSE"].includes(result.code);
  return json({
    ok: false,
    code: result.code,
    message: configError
      ? "A verificação de segurança está temporariamente indisponível. Tente novamente em instantes."
      : "Confirme que você não é um robô."
  }, configError ? 503 : 400);
}

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ ok: false, code: "DB_NOT_CONFIGURED" }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }

  const turnstile = await verifyTurnstileDetailed(context.env, context.request, body.turnstileToken);
  if (!turnstile.ok) return turnstileFailure(turnstile);

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
