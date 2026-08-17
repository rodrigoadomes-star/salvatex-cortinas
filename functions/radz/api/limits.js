import { auditRadz, json, requireRadzAdmin } from "./_auth.js";
import { calculateEffectiveLimit, clean, LIMIT_KEYS, nowIso } from "./_policy.js";

async function companyLimits(db, companyId) {
  const company = await db.prepare(`SELECT c.id,c.trade_name,c.plan_code,p.access_blocked,p.deleted_at
    FROM platform_companies c
    LEFT JOIN platform_company_profile p ON p.company_id=c.id
    WHERE c.id=?1`).bind(companyId).first();
  if (!company) return null;

  const [baseRows, overrides] = await Promise.all([
    db.prepare(`SELECT limit_key,limit_value FROM platform_plan_limits WHERE plan_code=?1`).bind(company.plan_code).all(),
    db.prepare(`SELECT id,company_id,limit_key,mode,limit_value,reason,starts_at,expires_at,active,created_by_user_id,created_at,updated_at
      FROM platform_company_limit_overrides WHERE company_id=?1 ORDER BY created_at DESC`).bind(companyId).all(),
  ]);

  const base = {};
  for (const row of baseRows.results || []) base[row.limit_key] = row.limit_value == null ? null : Number(row.limit_value);
  const allOverrides = overrides.results || [];
  const effective = {};
  for (const key of LIMIT_KEYS) {
    effective[key] = calculateEffectiveLimit(base[key] ?? null, allOverrides.filter((x) => x.limit_key === key));
  }
  return { company, base, overrides: allOverrides, effective };
}

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  const companyId = clean(new URL(context.request.url).searchParams.get("companyId"), 100);
  if (!companyId) return json({ ok: false, message: "Empresa obrigatória." }, 422);
  const result = await companyLimits(context.env.DB, companyId);
  if (!result) return json({ ok: false, message: "Empresa não encontrada." }, 404);
  return json({ ok: true, ...result, limitKeys: [...LIMIT_KEYS] });
}

export async function onRequestPost(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  const companyId = clean(body.companyId, 100);
  const limitKey = clean(body.limitKey, 100);
  const mode = ["add", "set", "cap"].includes(body.mode) ? body.mode : "add";
  const value = Math.round(Number(body.value));
  if (!companyId || !LIMIT_KEYS.has(limitKey) || !Number.isFinite(value)) return json({ ok: false, message: "Exceção de limite inválida." }, 422);
  const company = await context.env.DB.prepare("SELECT id FROM platform_companies WHERE id=?1").bind(companyId).first();
  if (!company) return json({ ok: false, message: "Empresa não encontrada." }, 404);
  const id = crypto.randomUUID();
  const now = nowIso();
  await context.env.DB.prepare(`INSERT INTO platform_company_limit_overrides
    (id,company_id,limit_key,mode,limit_value,reason,starts_at,expires_at,active,created_by_user_id,created_at,updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,1,?9,?10,?10)`)
    .bind(id, companyId, limitKey, mode, value, clean(body.reason, 500), body.startsAt || null, body.expiresAt || null, auth.session.user_id || null, now)
    .run();
  await auditRadz(context, auth, "platform.limit.override_created", "limit_override", id, { companyId, limitKey, mode, value, expiresAt: body.expiresAt || null });
  return json({ ok: true, id }, 201);
}

export async function onRequestPatch(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  const id = clean(body.id, 100);
  const current = await context.env.DB.prepare("SELECT * FROM platform_company_limit_overrides WHERE id=?1").bind(id).first();
  if (!current) return json({ ok: false, message: "Exceção não encontrada." }, 404);
  const active = body.active == null ? Number(current.active) : (body.active ? 1 : 0);
  const value = body.value == null ? Number(current.limit_value) : Math.round(Number(body.value));
  const mode = ["add", "set", "cap"].includes(body.mode) ? body.mode : current.mode;
  if (!Number.isFinite(value)) return json({ ok: false, message: "Valor inválido." }, 422);
  const now = nowIso();
  await context.env.DB.prepare(`UPDATE platform_company_limit_overrides SET mode=?1,limit_value=?2,reason=?3,starts_at=?4,expires_at=?5,active=?6,updated_at=?7 WHERE id=?8`)
    .bind(mode, value, clean(body.reason ?? current.reason, 500), body.startsAt ?? current.starts_at, body.expiresAt ?? current.expires_at, active, now, id).run();
  await auditRadz(context, auth, "platform.limit.override_updated", "limit_override", id, { active: Boolean(active), value, mode });
  return json({ ok: true });
}
