import { hashPassword, json, sha256 } from './_lib.js';

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ ok: false, message: 'Banco de dados temporariamente indisponível.' }, 503);
  let body = {};
  try { body = await context.request.json(); } catch { return json({ ok: false, message: 'Dados inválidos.' }, 400); }

  const token = String(body.token || '').trim();
  const password = String(body.password || '');
  if (!token) return json({ ok: false, message: 'Link de redefinição inválido.' }, 400);
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/.test(password)) return json({ ok: false, message: 'A senha precisa ter 10 caracteres, maiúscula, minúscula e número.' }, 422);

  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS platform_password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  )`).run();

  const tokenHash = await sha256(token);
  const reset = await context.env.DB.prepare(`SELECT id,user_id,company_id,expires_at,used_at FROM platform_password_resets WHERE token_hash=?1 LIMIT 1`).bind(tokenHash).first();
  if (!reset || reset.used_at || Date.parse(reset.expires_at) <= Date.now()) return json({ ok: false, message: 'Este link é inválido ou expirou. Solicite uma nova redefinição.' }, 400);

  const user = await context.env.DB.prepare('SELECT id,company_id,email FROM platform_users WHERE id=?1 AND company_id=?2 LIMIT 1').bind(reset.user_id, reset.company_id).first();
  if (!user) return json({ ok: false, message: 'Conta não encontrada.' }, 404);

  const passwordData = await hashPassword(password);
  const now = new Date().toISOString();
  await context.env.DB.prepare(`UPDATE platform_users SET password_hash=?1,password_salt=?2,password_iterations=?3,updated_at=?4 WHERE id=?5`)
    .bind(passwordData.hash, passwordData.salt, passwordData.iterations, now, user.id).run();

  const store = await context.env.DB.prepare(`SELECT s.id FROM stores s JOIN platform_company_stores pcs ON pcs.store_id=s.id WHERE pcs.company_id=?1 LIMIT 1`).bind(user.company_id).first();
  if (store) {
    try {
      await context.env.DB.prepare(`UPDATE admin_users SET password_hash=?1,password_salt=?2,password_iterations=?3,session_version=COALESCE(session_version,1)+1,updated_at=?4 WHERE store_id=?5 AND email=?6`)
        .bind(passwordData.hash, passwordData.salt, passwordData.iterations, now, store.id, user.email).run();
    } catch (error) {
      console.error('[RADZ platform reset admin sync]', String(error?.message || error));
    }
  }

  await context.env.DB.prepare('UPDATE platform_password_resets SET used_at=?1 WHERE id=?2').bind(now, reset.id).run();
  await context.env.DB.prepare('DELETE FROM platform_sessions WHERE user_id=?1').bind(user.id).run();
  return json({ ok: true, message: 'Senha alterada com sucesso. Você já pode entrar novamente.' });
}
