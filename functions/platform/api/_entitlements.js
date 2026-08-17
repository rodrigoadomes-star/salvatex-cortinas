function activeTime(row, now = Date.now()) {
  if (!row) return false;
  if (row.active === 0) return false;
  if (row.starts_at && Date.parse(row.starts_at) > now) return false;
  if (row.expires_at && Date.parse(row.expires_at) <= now) return false;
  return true;
}

export async function getEffectiveLimits(db, companyId) {
  const company = await db.prepare("SELECT plan_code FROM platform_companies WHERE id=?1").bind(companyId).first();
  if (!company) return {};
  const [baseRows, overrideRows] = await Promise.all([
    db.prepare("SELECT limit_key,limit_value FROM platform_plan_limits WHERE plan_code=?1").bind(company.plan_code).all(),
    db.prepare(`SELECT limit_key,mode,limit_value,starts_at,expires_at,active
      FROM platform_company_limit_overrides WHERE company_id=?1 AND active=1`).bind(companyId).all(),
  ]);
  const base = {};
  for (const row of baseRows.results || []) base[row.limit_key] = row.limit_value == null ? null : Number(row.limit_value);
  const grouped = {};
  for (const row of overrideRows.results || []) {
    if (!activeTime(row)) continue;
    (grouped[row.limit_key] ||= []).push(row);
  }
  const result = { ...base };
  for (const [key, rows] of Object.entries(grouped)) {
    let value = Object.prototype.hasOwnProperty.call(base, key) ? base[key] : null;
    for (const row of rows.filter((x) => x.mode === "set")) value = Number(row.limit_value);
    for (const row of rows.filter((x) => x.mode === "add")) value = value == null ? Number(row.limit_value) : value + Number(row.limit_value);
    for (const row of rows.filter((x) => x.mode === "cap")) {
      const cap = Number(row.limit_value);
      if (value == null || value > cap) value = cap;
    }
    result[key] = value;
  }
  return result;
}

export async function getEffectiveFeatures(db, companyId) {
  const company = await db.prepare("SELECT plan_code FROM platform_companies WHERE id=?1").bind(companyId).first();
  if (!company) return [];
  const rows = await db.prepare(`SELECT fc.feature_key,fc.name,fc.description,fc.global_enabled,
      COALESCE(pf.enabled,0) plan_enabled,
      co.state company_state,co.settings_json company_settings,co.expires_at,
      legacy.enabled legacy_enabled,legacy.settings_json legacy_settings
    FROM platform_feature_catalog fc
    LEFT JOIN platform_plan_features pf ON pf.plan_code=?2 AND pf.feature_key=fc.feature_key
    LEFT JOIN platform_company_feature_overrides co ON co.company_id=?1 AND co.feature_key=fc.feature_key
    LEFT JOIN platform_features legacy ON legacy.company_id=?1 AND legacy.feature_key=fc.feature_key
    WHERE fc.deleted_at IS NULL
    ORDER BY fc.sort_order,fc.feature_key`).bind(companyId, company.plan_code).all();

  const now = Date.now();
  return (rows.results || []).map((row) => {
    let state = row.company_state || "inherit";
    if (row.expires_at && Date.parse(row.expires_at) <= now) state = "inherit";
    // Compatibilidade: se o plano ainda não foi configurado para um recurso antigo,
    // preserva o valor legado da empresa. O novo modelo passa a prevalecer assim
    // que houver configuração explícita no plano ou override.
    let planEnabled = Boolean(row.plan_enabled);
    if (!row.plan_enabled && row.legacy_enabled != null && state === "inherit") planEnabled = Boolean(row.legacy_enabled);
    let enabled = false;
    if (!row.global_enabled) enabled = false;
    else if (state === "deny") enabled = false;
    else if (state === "allow") enabled = true;
    else enabled = planEnabled;
    return {
      feature_key: row.feature_key,
      name: row.name,
      description: row.description,
      enabled,
      source: !row.global_enabled ? "global_block" : state !== "inherit" ? "company_override" : row.plan_enabled ? "plan" : row.legacy_enabled != null ? "legacy_company" : "plan",
      settings_json: row.company_settings || row.legacy_settings || "{}",
    };
  });
}

export async function assertFeature(db, companyId, featureKey) {
  const features = await getEffectiveFeatures(db, companyId);
  return features.some((x) => x.feature_key === featureKey && x.enabled);
}
