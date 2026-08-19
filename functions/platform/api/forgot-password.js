import { json, normalizeEmail, randomToken, sha256, validEmail, verifyTurnstileDetailed } from './_lib.js';

const GENERIC = 'Se o e-mail estiver cadastrado, enviaremos um link de redefinição.';

async function sendResetEmail(env, { to, resetUrl }) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error('E-mail transacional não configurado.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject: 'Redefinição de senha — RADZ HUB',
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7f9;padding:32px;color:#101828"><div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:32px"><h2 style="margin-top:0">Redefinir senha</h2><p>Recebemos uma solicitação para redefinir sua senha de acesso à RADZ HUB.</p><p style="margin:28px 0"><a href="${resetUrl}" style="background:#071b2e;color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;display:inline-block">Criar nova senha</a></p><p>Este link é de uso único e expira em 20 minutos.</p><p style="font-size:13px;color:#667085">Se você não solicitou esta alteração, ignore este e-mail.</p></div></body></html>`
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[RADZ platform reset resend]', response.status, text.slice(0, 500));
    throw new Error(`Falha ao enviar e-mail (${response.status}).`);
  }
}

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ ok: false, message: 'Banco de dados temporariamente indisponível.' }, 503);
  let body = {};
  try { body = await context.request.json(); } catch { return json({ ok: false, message: 'Dados inválidos.' }, 400); }

  const turnstile = await verifyTurnstileDetailed(context.env, context.request, body.turnstileToken);
  if (!turnstile.ok) return json({ ok: false, code: turnstile.code, message: 'Confirme a verificação de segurança e tente novamente.' }, 400);

  const email = normalizeEmail(body.email);
  if (!validEmail(email)) return json({ ok: true, message: GENERIC });

  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS platform_password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  )`).run();
  await context.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_platform_password_resets_user ON platform_password_resets(user_id,created_at)').run();

  const user = await context.env.DB.prepare('SELECT id,company_id,email,active FROM platform_users WHERE email=?1 LIMIT 1').bind(email).first();
  if (!user || Number(user.active) === 0) return json({ ok: true, message: GENERIC });

  const recent = await context.env.DB.prepare('SELECT created_at FROM platform_password_resets WHERE user_id=?1 ORDER BY created_at DESC LIMIT 1').bind(user.id).first();
  if (recent && Date.now() - Date.parse(recent.created_at) < 60000) return json({ ok: true, message: GENERIC });

  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = new Date();
  const expires = new Date(now.getTime() + 20 * 60 * 1000);
  await context.env.DB.prepare('UPDATE platform_password_resets SET used_at=?1 WHERE user_id=?2 AND used_at IS NULL').bind(now.toISOString(), user.id).run();
  await context.env.DB.prepare('INSERT INTO platform_password_resets(id,user_id,company_id,token_hash,expires_at,created_at) VALUES(?1,?2,?3,?4,?5,?6)')
    .bind(crypto.randomUUID(), user.id, user.company_id, tokenHash, expires.toISOString(), now.toISOString()).run();

  const resetUrl = `${new URL(context.request.url).origin}/platform/reset-password.html?token=${encodeURIComponent(token)}`;
  try { await sendResetEmail(context.env, { to: user.email, resetUrl }); }
  catch (error) {
    console.error('[RADZ platform reset email]', String(error?.message || error));
    return json({ ok: false, message: 'Não foi possível enviar o e-mail de recuperação agora.' }, 503);
  }
  return json({ ok: true, message: GENERIC });
}
