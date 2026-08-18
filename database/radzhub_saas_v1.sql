PRAGMA foreign_keys = ON;

-- RADZ HUB SaaS v1. Migração aditiva: preserva integralmente os dados da Salvatex.
CREATE TABLE IF NOT EXISTS platform_companies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('cpf','cnpj')),
  document_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  segment TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('pending_email','trial','active','suspended','cancelled')),
  plan_code TEXT NOT NULL DEFAULT 'free',
  platform_fee_basis_points INTEGER NOT NULL DEFAULT 100 CHECK (platform_fee_basis_points BETWEEN 0 AND 10000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_users (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 210000,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('platform_owner','platform_support','owner','manager','staff')),
  email_verified_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id)
);

CREATE TABLE IF NOT EXISTS platform_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  rotated_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES platform_users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_domains (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  hostname TEXT NOT NULL UNIQUE,
  domain_type TEXT NOT NULL CHECK (domain_type IN ('platform_subdomain','custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verifying','active','failed','disabled')),
  verification_token TEXT,
  verification_method TEXT NOT NULL DEFAULT 'cname',
  verification_error TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_features (
  company_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, feature_key),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  company_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_users_company ON platform_users(company_id, active);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user ON platform_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_platform_domains_company ON platform_domains(company_id, status);
CREATE INDEX IF NOT EXISTS idx_platform_companies_status ON platform_companies(status, created_at DESC);

-- Vincula a loja existente à primeira empresa sem alterar os pedidos existentes.
INSERT OR IGNORE INTO platform_companies (
  id, slug, legal_name, trade_name, document_type, document_number,
  email, status, plan_code, platform_fee_basis_points, created_at, updated_at
) VALUES (
  'company-salvatex', 'salvatex', 'Salvatex Cortinas', 'Salvatex Cortinas',
  'cnpj', 'PENDENTE_CONFIGURACAO', 'PENDENTE_CONFIGURACAO', 'active', 'founder', 100,
  datetime('now'), datetime('now')
);

CREATE TABLE IF NOT EXISTS platform_company_stores (
  company_id TEXT NOT NULL UNIQUE,
  store_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (company_id, store_id),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO platform_company_stores (company_id, store_id, created_at)
VALUES ('company-salvatex', 'salvatex', datetime('now'));

INSERT OR IGNORE INTO platform_domains (
  id, company_id, hostname, domain_type, status, verification_method, verified_at, created_at, updated_at
) VALUES (
  'domain-salvatex-radzhub', 'company-salvatex', 'salvatex.radzhub.com.br',
  'platform_subdomain', 'active', 'platform', datetime('now'), datetime('now'), datetime('now')
);

INSERT OR IGNORE INTO platform_features (company_id, feature_key, enabled, settings_json, updated_at)
VALUES
  ('company-salvatex','catalog',1,'{}',datetime('now')),
  ('company-salvatex','orders',1,'{}',datetime('now')),
  ('company-salvatex','customers',1,'{}',datetime('now')),
  ('company-salvatex','custom_domain',1,'{}',datetime('now')),
  ('company-salvatex','shipping',1,'{}',datetime('now')),
  ('company-salvatex','payments',1,'{}',datetime('now'));
