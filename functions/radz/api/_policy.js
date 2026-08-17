export function clean(value, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

export function parseJson(value, fallback = {}) {
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function activeOverride(row, now = Date.now()) {
  if (!row || row.active === 0) return false;
  if (row.starts_at && Date.parse(row.starts_at) > now) return false;
  if (row.expires_at && Date.parse(row.expires_at) <= now) return false;
  return true;
}

export function calculateEffectiveLimit(baseValue, overrides = []) {
  let value = baseValue == null ? null : Number(baseValue);
  const active = overrides.filter(activeOverride);

  for (const row of active.filter((x) => x.mode === "set")) {
    value = Number(row.limit_value);
  }
  for (const row of active.filter((x) => x.mode === "add")) {
    if (value == null) value = Number(row.limit_value);
    else value += Number(row.limit_value);
  }
  for (const row of active.filter((x) => x.mode === "cap")) {
    const cap = Number(row.limit_value);
    if (value == null || value > cap) value = cap;
  }
  return value;
}

export function calculateFeatureState(globalEnabled, planEnabled, companyOverride) {
  // Prioridade documentada:
  // bloqueio global > configuração específica da empresa > configuração do plano.
  if (!globalEnabled) return false;
  if (companyOverride === "deny") return false;
  if (companyOverride === "allow") return true;
  return Boolean(planEnabled);
}

export const LIMIT_KEYS = new Set([
  "products_max",
  "listings_daily",
  "listings_monthly",
  "ai_daily",
  "ai_monthly",
  "ai_image_analysis",
  "ai_description",
  "ai_commands",
  "bulk_max_per_job",
  "users_max",
  "storage_bytes",
]);
