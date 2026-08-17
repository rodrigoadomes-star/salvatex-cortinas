import { auditRadz, json, requireRadzAdmin } from "./_auth.js";
import { clean, LIMIT_KEYS, nowIso } from "./_policy.js";

function codeOf(value) {
  return clean(value, 60).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function readPlans(db) {
  const [plans, limits, features] = await Promise.all([
    db.prepare(`SELECT code,name,description,price_cents,billing_period,active,sort_order,metadata_json,deleted_at,created_at,updated_at
      FROM platform_plans
      WHERE deleted_at IS NULL
      ORDER BY sort_order,name`).all(),
    db.prepare(`SELECT plan_code,limit_key,limit_value,updated_at
      FROM platform_plan_limits ORDER BY plan_code,limit_key`).all(),
    db.prepare(`SELECT plan_code,feature_key,enabled,settings_json,updated_at
      FROM platform_plan_features ORDER BY plan_code,feature_key`).all(),
  ]);
  const limitMap = new Map();
  for (const row of limits.results || []) {
    if (!limitMap.has(row.plan_code)) limitMap.set(row.plan_code, {});
    limitMap.get(row.plan_code)[row.limit_key] = row.limit_value == null ? null : Number(row.limit_value);
  }
  const featureMap = new Map();
  for (const row of features.results || []) {
    if (!featureMap.has(row.plan_code)) featureMap.set(row.plan_code, {});
    featureMap.get(row.plan_code)[row.feature_key] = Boolean(row.enabled);
  }
  return (plans.results || []).map((plan) => ({
    ...plan,
    active: Boolean(plan.active),
    limits: limitMap.get(plan.code) || {},
    features: featureMap.get(plan.code) || {},
  }));
}

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  return json({ ok: true, plans: await readPlans(context.env.DB), limitKeys: [...LIMIT_KEYS] });
}

export async function onRequestPost(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }

  if (body.action === "duplicate") {
    const source = codeOf(body.sourceCode);
    const code = codeOf(body.code);
    if (!source || !code || source === code) return json({ ok: false, message: "Códigos de plano inválidos." }, 422);
    const existing = await context.env.DB.prepare("SELECT code FROM platform_plans WHERE code=?1").bind(code).first();
    if (existing) return json({ ok: false, message: "Já existe um plano com esse código." }, 409);
    const src = await context.env.DB.prepare("SELECT * FROM platform_plans WHERE code=?1 AND deleted_at IS NULL").bind(source).first();
    if (!src) return json({ ok: false, message: "Plano de origem não encontrado." }, 404);
    const now = nowIso();
    await context.env.DB.batch([
      context.env.DB.prepare(`INSERT INTO platform_plans
        (code,name,description,price_cents,billing_period,active,sort_order,metadata_json,created_at,updated_at)
        VALUES (?1,?2,?3,?4,?5,0,?6,?7,?8,?8)`)
        .bind(code, clean(body.name || `${src.name} (cópia)`, 120), src.description, src.price_cents, src.billing_period, Number(src.sort_order || 0) + 1, src.metadata_json || "{}", now),
      context.env.DB.prepare(`INSERT INTO platform_plan_limits(plan_code,limit_key,limit_value,updated_at)
        SELECT ?1,limit_key,limit_value,?2 FROM platform_plan_limits WHERE plan_code=?3`)
        .bind(code, now, source),
      context.env.DB.prepare(`INSERT INTO platform_plan_features(plan_code,feature_key,enabled,settings_json,updated_at)
        SELECT ?1,feature_key,enabled,settings_json,?2 FROM platform_plan_features WHERE plan_code=?3`)
        .bind(code, now, source),
    ]);
    await auditRadz(context, auth, "platform.plan.duplicated", "plan", code, { source });
    return json({ ok: true, plan: code });
  }

  const code = codeOf(body.code);
  const name = clean(body.name, 120);
  const period = ["monthly", "yearly", "one_time", "custom"].includes(body.billingPeriod) ? body.billingPeriod : "monthly";
  const price = Math.max(0, Math.round(Number(body.priceCents || 0)));
  if (!code || !name || !Number.isFinite(price)) return json({ ok: false, message: "Plano inválido." }, 422);
  const now = nowIso();
  try {
    await context.env.DB.prepare(`INSERT INTO platform_plans
      (code,name,description,price_cents,billing_period,active,sort_order,metadata_json,created_at,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,'{}',?8,?8)`)
      .bind(code, name, clean(body.description, 1000), price, period, body.active === false ? 0 : 1, Number(body.sortOrder || 0), now)
      .run();
  } catch (error) {
    return json({ ok: false, message: "Não foi possível criar o plano. Verifique se o código já existe." }, 409);
  }
  await auditRadz(context, auth, "platform.plan.created", "plan", code, { name, priceCents: price });
  return json({ ok: true, plan: code }, 201);
}

export async function onRequestPatch(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  const code = codeOf(body.code);
  const current = await context.env.DB.prepare("SELECT * FROM platform_plans WHERE code=?1 AND deleted_at IS NULL").bind(code).first();
  if (!current) return json({ ok: false, message: "Plano não encontrado." }, 404);

  const now = nowIso();
  const name = clean(body.name ?? current.name, 120);
  const description = clean(body.description ?? current.description, 1000);
  const period = ["monthly", "yearly", "one_time", "custom"].includes(body.billingPeriod) ? body.billingPeriod : current.billing_period;
  const price = Math.max(0, Math.round(Number(body.priceCents ?? current.price_cents)));
  const active = body.active == null ? Number(current.active) : (body.active ? 1 : 0);
  const sortOrder = Number(body.sortOrder ?? current.sort_order ?? 0);

  const statements = [
    context.env.DB.prepare(`UPDATE platform_plans SET name=?1,description=?2,price_cents=?3,billing_period=?4,active=?5,sort_order=?6,updated_at=?7 WHERE code=?8`)
      .bind(name, description, price, period, active, sortOrder, now, code),
  ];

  if (body.limits && typeof body.limits === "object") {
    for (const [limitKey, raw] of Object.entries(body.limits)) {
      if (!LIMIT_KEYS.has(limitKey)) continue;
      const value = raw === null || raw === "" ? null : Math.max(0, Math.round(Number(raw)));
      if (value !== null && !Number.isFinite(value)) continue;
      statements.push(context.env.DB.prepare(`INSERT INTO platform_plan_limits(plan_code,limit_key,limit_value,updated_at)
        VALUES (?1,?2,?3,?4)
        ON CONFLICT(plan_code,limit_key) DO UPDATE SET limit_value=excluded.limit_value,updated_at=excluded.updated_at`)
        .bind(code, limitKey, value, now));
    }
  }

  if (body.features && typeof body.features === "object") {
    for (const [featureKey, enabled] of Object.entries(body.features)) {
      statements.push(context.env.DB.prepare(`INSERT INTO platform_plan_features(plan_code,feature_key,enabled,settings_json,updated_at)
        VALUES (?1,?2,?3,'{}',?4)
        ON CONFLICT(plan_code,feature_key) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at`)
        .bind(code, clean(featureKey, 100), enabled ? 1 : 0, now));
    }
  }

  await context.env.DB.batch(statements);
  await auditRadz(context, auth, "platform.plan.updated", "plan", code, { active: Boolean(active), priceCents: price });
  return json({ ok: true });
}
