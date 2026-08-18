import { json } from "./_lib.js";

const REQUIRED = {
  platform_companies: ["id","slug","legal_name","trade_name","document_type","document_number","email","phone","segment","status","plan_code","created_at","updated_at"],
  platform_users: ["id","company_id","name","email","password_hash","password_salt","password_iterations","role","active","created_at","updated_at"],
  stores: ["id","slug","name","active","platform_fee_percent","platform_fee_minimum_cents","created_at","updated_at"],
  platform_company_stores: ["company_id","store_id","created_at"],
  platform_domains: ["id","company_id","hostname","domain_type","status","created_at","updated_at"],
  store_configs: ["store_id","config_key","value_json","updated_at"],
  platform_sessions: ["id","user_id","company_id","token_hash","expires_at","created_at","last_seen_at"],
  platform_legal_acceptances: ["id","company_id","user_id","terms_version","privacy_version","accepted_at","ip_hash","user_agent","source"],
  platform_features: ["company_id","feature_key","enabled","settings_json","updated_at"],
  platform_audit_logs: ["actor_user_id","company_id","action","metadata_json","ip_hash","created_at"]
};

export async function onRequestGet(context) {
  if (!context.env.DB) return json({ ok: false, code: "DB_NOT_CONFIGURED" }, 503);

  const tables = {};
  let ok = true;
  try {
    for (const [table, requiredColumns] of Object.entries(REQUIRED)) {
      const result = await context.env.DB.prepare(`PRAGMA table_info(${table})`).all();
      const columns = (result.results || []).map((row) => String(row.name));
      const missing = requiredColumns.filter((column) => !columns.includes(column));
      const exists = columns.length > 0;
      if (!exists || missing.length) ok = false;
      tables[table] = { exists, missing, columns };
    }

    return json({
      ok,
      code: ok ? "REGISTER_SCHEMA_READY" : "REGISTER_SCHEMA_MISMATCH",
      tables
    }, ok ? 200 : 503);
  } catch (error) {
    return json({
      ok: false,
      code: "REGISTER_SCHEMA_CHECK_FAILED",
      errorName: error?.name || null,
      errorMessage: String(error?.message || "").slice(0, 180) || null
    }, 503);
  }
}
