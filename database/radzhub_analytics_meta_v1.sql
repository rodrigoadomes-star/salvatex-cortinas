PRAGMA foreign_keys = ON;

-- RADZ HUB Analytics + Meta vault v1
-- Migração aditiva e não destrutiva. Não armazena secrets/tokens em texto puro.

CREATE TABLE IF NOT EXISTS platform_analytics_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  store_id TEXT,
  event_type TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  page_title TEXT,
  referrer_host TEXT,
  product_id TEXT,
  value_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  device_type TEXT,
  event_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_company_date
  ON platform_analytics_events(company_id, event_date, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_company_type_date
  ON platform_analytics_events(company_id, event_type, event_date);
CREATE INDEX IF NOT EXISTS idx_analytics_company_visitor_date
  ON platform_analytics_events(company_id, visitor_id, event_date);
CREATE INDEX IF NOT EXISTS idx_analytics_company_campaign_date
  ON platform_analytics_events(company_id, utm_campaign, event_date);
CREATE INDEX IF NOT EXISTS idx_analytics_company_path_date
  ON platform_analytics_events(company_id, path, event_date);

CREATE TABLE IF NOT EXISTS platform_analytics_daily (
  company_id TEXT NOT NULL,
  event_date TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  product_views INTEGER NOT NULL DEFAULT 0,
  add_to_cart INTEGER NOT NULL DEFAULT 0,
  checkout_started INTEGER NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, event_date),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date
  ON platform_analytics_daily(event_date, company_id);

CREATE TABLE IF NOT EXISTS platform_integrations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connected','expired','error','disabled')),
  external_account_id TEXT,
  external_account_name TEXT,
  encrypted_access_token TEXT,
  token_iv TEXT,
  token_tag_version INTEGER NOT NULL DEFAULT 1,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  token_expires_at TEXT,
  connected_by_user_id TEXT,
  connected_at TEXT,
  last_checked_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(company_id, provider),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (connected_by_user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_integrations_company_status
  ON platform_integrations(company_id, provider, status);

CREATE TABLE IF NOT EXISTS platform_meta_ad_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  meta_ad_account_id TEXT NOT NULL,
  name TEXT,
  currency TEXT,
  timezone_name TEXT,
  status TEXT,
  is_selected INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(company_id, meta_ad_account_id),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (integration_id) REFERENCES platform_integrations(id)
);

CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_company
  ON platform_meta_ad_accounts(company_id, is_selected, status);
