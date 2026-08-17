import { auditRadz, json, requireRadzAdmin } from "./_auth.js";
import { clean, nowIso, parseJson } from "./_policy.js";

const ALLOWED = new Set([
  "platform_identity",
  "registrations",
  "maintenance",
  "ai_global",
  "support",
  "defaults",
]);

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  const rows = await context.env.DB.prepare(`SELECT setting_key,value_json,updated_at
    FROM platform_settings ORDER BY setting_key`).all();
  const settings = {};
  for (const row of rows.results || []) settings[row.setting_key] = parseJson(row.value_json, {});
  return json({ ok: true, settings });
}

export async function onRequestPatch(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  const key = clean(body.key, 100);
  if (!ALLOWED.has(key)) return json({ ok: false, message: "Configuração não permitida nesta fase." }, 422);
  const value = body.value && typeof body.value === "object" ? body.value : {};
  const now = nowIso();
  await context.env.DB.prepare(`INSERT INTO platform_settings(setting_key,value_json,updated_by_user_id,updated_at)
    VALUES (?1,?2,?3,?4)
    ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_by_user_id=excluded.updated_by_user_id,updated_at=excluded.updated_at`)
    .bind(key, JSON.stringify(value), auth.session.user_id || null, now).run();
  await auditRadz(context, auth, "platform.setting.updated", "platform_setting", key, { value });
  return json({ ok: true });
}
