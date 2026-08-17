import { auditRadz, json, requireRadzAdmin } from "./_auth.js";
import { calculateFeatureState, clean, nowIso } from "./_policy.js";

async function readAll(db) {
  const [catalog, planRows, companyRows] = await Promise.all([
    db.prepare(`SELECT feature_key,name,description,global_enabled,settings_json,sort_order,deleted_at,created_at,updated_at
      FROM platform_feature_catalog WHERE deleted_at IS NULL ORDER BY sort_order,name`).all(),
    db.prepare(`SELECT plan_code,feature_key,enabled,settings_json,updated_at FROM platform_plan_features`).all(),
    db.prepare(`SELECT o.company_id,o.feature_key,o.state,o.settings_json,o.expires_at,o.updated_at,c.trade_name
      FROM platform_company_feature_overrides o
      JOIN platform_companies c ON c.id=o.company_id
      ORDER BY c.trade_name,o.feature_key`).all(),
  ]);
  return {
    catalog: (catalog.results || []).map((x) => ({ ...x, global_enabled: Boolean(x.global_enabled) })),
    planFeatures: planRows.results || [],
    companyOverrides: companyRows.results || [],
  };
}

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  const data = await readAll(context.env.DB);
  return json({ ok: true, ...data, priority: "global_block > company_override > plan" });
}

export async function onRequestPost(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }

  const key = clean(body.featureKey, 100).toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  const name = clean(body.name, 120);
  if (!key || !name) return json({ ok: false, message: "Recurso inválido." }, 422);
  const now = nowIso();
  try {
    await context.env.DB.prepare(`INSERT INTO platform_feature_catalog
      (feature_key,name,description,global_enabled,settings_json,sort_order,created_at,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?7)`)
      .bind(key, name, clean(body.description, 1000), body.globalEnabled === false ? 0 : 1, JSON.stringify(body.settings || {}), Number(body.sortOrder || 0), now)
      .run();
  } catch {
    return json({ ok: false, message: "Já existe um recurso com essa chave." }, 409);
  }
  await auditRadz(context, auth, "platform.feature.created", "feature", key, { name });
  return json({ ok: true, featureKey: key }, 201);
}

export async function onRequestPatch(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  const now = nowIso();
  const key = clean(body.featureKey, 100);
  const feature = await context.env.DB.prepare("SELECT * FROM platform_feature_catalog WHERE feature_key=?1 AND deleted_at IS NULL")
    .bind(key).first();
  if (!feature) return json({ ok: false, message: "Recurso não encontrado." }, 404);

  if (body.scope === "plan") {
    const planCode = clean(body.planCode, 60);
    const plan = await context.env.DB.prepare("SELECT code FROM platform_plans WHERE code=?1 AND deleted_at IS NULL").bind(planCode).first();
    if (!plan) return json({ ok: false, message: "Plano não encontrado." }, 404);
    await context.env.DB.prepare(`INSERT INTO platform_plan_features(plan_code,feature_key,enabled,settings_json,updated_at)
      VALUES (?1,?2,?3,?4,?5)
      ON CONFLICT(plan_code,feature_key) DO UPDATE SET enabled=excluded.enabled,settings_json=excluded.settings_json,updated_at=excluded.updated_at`)
      .bind(planCode, key, body.enabled ? 1 : 0, JSON.stringify(body.settings || {}), now).run();
    await auditRadz(context, auth, "platform.feature.plan_updated", "feature", key, { planCode, enabled: Boolean(body.enabled) });
    return json({ ok: true });
  }

  if (body.scope === "company") {
    const companyId = clean(body.companyId, 100);
    const state = ["inherit", "allow", "deny"].includes(body.state) ? body.state : "inherit";
    const company = await context.env.DB.prepare("SELECT id FROM platform_companies WHERE id=?1").bind(companyId).first();
    if (!company) return json({ ok: false, message: "Empresa não encontrada." }, 404);
    await context.env.DB.prepare(`INSERT INTO platform_company_feature_overrides
      (company_id,feature_key,state,settings_json,expires_at,updated_by_user_id,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7)
      ON CONFLICT(company_id,feature_key) DO UPDATE SET state=excluded.state,settings_json=excluded.settings_json,
      expires_at=excluded.expires_at,updated_by_user_id=excluded.updated_by_user_id,updated_at=excluded.updated_at`)
      .bind(companyId, key, state, JSON.stringify(body.settings || {}), body.expiresAt || null, auth.session.user_id || null, now).run();
    await auditRadz(context, auth, "platform.feature.company_override", "feature", key, { companyId, state, expiresAt: body.expiresAt || null });
    return json({ ok: true });
  }

  const globalEnabled = body.globalEnabled == null ? Number(feature.global_enabled) : (body.globalEnabled ? 1 : 0);
  const name = clean(body.name ?? feature.name, 120);
  const description = clean(body.description ?? feature.description, 1000);
  const sortOrder = Number(body.sortOrder ?? feature.sort_order ?? 0);
  const settings = body.settings == null ? feature.settings_json : JSON.stringify(body.settings || {});
  await context.env.DB.prepare(`UPDATE platform_feature_catalog
    SET name=?1,description=?2,global_enabled=?3,settings_json=?4,sort_order=?5,updated_at=?6
    WHERE feature_key=?7`)
    .bind(name, description, globalEnabled, settings, sortOrder, now, key).run();
  await auditRadz(context, auth, "platform.feature.updated", "feature", key, { globalEnabled: Boolean(globalEnabled) });
  return json({ ok: true });
}

export async function effectiveFeatureForCompany(db, companyId, featureKey) {
  const row = await db.prepare(`SELECT c.plan_code,fc.global_enabled,pf.enabled plan_enabled,co.state,co.expires_at
    FROM platform_companies c
    JOIN platform_feature_catalog fc ON fc.feature_key=?2
    LEFT JOIN platform_plan_features pf ON pf.plan_code=c.plan_code AND pf.feature_key=fc.feature_key
    LEFT JOIN platform_company_feature_overrides co ON co.company_id=c.id AND co.feature_key=fc.feature_key
    WHERE c.id=?1`).bind(companyId, featureKey).first();
  if (!row) return false;
  let override = row.state || "inherit";
  if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) override = "inherit";
  return calculateFeatureState(Boolean(row.global_enabled), Boolean(row.plan_enabled), override);
}
