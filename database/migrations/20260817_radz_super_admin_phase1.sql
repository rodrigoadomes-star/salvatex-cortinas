PRAGMA foreign_keys = ON;

-- RADZ HUB Super Admin — Fase 1
-- Migração aditiva. Não remove nem renomeia tabelas/colunas existentes.
-- Deve ser aplicada uma única vez em ambiente de teste antes de produção.

CREATE TABLE IF NOT EXISTS platform_company_profile (
  company_id TEXT PRIMARY KEY,
  whatsapp TEXT,
  address_json TEXT NOT NULL DEFAULT '{}',
  logo_object_key TEXT,
  favicon_object_key TEXT,
  trial_ends_at TEXT,
  billing_due_at TEXT,
  access_blocked INTEGER NOT NULL DEFAULT 0 CHECK (access_blocked IN (0,1)),
  deleted_at TEXT,
  last_activity_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id)
);

INSERT OR IGNORE INTO platform_company_profile (company_id, updated_at)
SELECT id, COALESCE(updated_at, datetime('now')) FROM platform_companies;

CREATE TABLE IF NOT EXISTS platform_plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','yearly','one_time','custom')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Preserva quaisquer plan_code já existentes sem exigir conversão manual.
INSERT OR IGNORE INTO platform_plans (
  code,name,description,price_cents,billing_period,active,sort_order,created_at,updated_at
)
SELECT DISTINCT
  plan_code,
  CASE WHEN plan_code='founder' THEN 'Founder' WHEN plan_code='free' THEN 'Grátis' ELSE plan_code END,
  'Plano importado da configuração existente.',
  0,
  'monthly',
  1,
  0,
  datetime('now'),
  datetime('now')
FROM platform_companies
WHERE plan_code IS NOT NULL AND trim(plan_code) <> '';

INSERT OR IGNORE INTO platform_plans (code,name,description,price_cents,billing_period,active,sort_order,created_at,updated_at)
VALUES
  ('free','Grátis','Plano gratuito da plataforma.',0,'monthly',1,10,datetime('now'),datetime('now')),
  ('founder','Founder','Plano fundador preservado para clientes existentes.',0,'monthly',1,20,datetime('now'),datetime('now'));

CREATE TABLE IF NOT EXISTS platform_plan_limits (
  plan_code TEXT NOT NULL,
  limit_key TEXT NOT NULL,
  limit_value INTEGER,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (plan_code, limit_key),
  FOREIGN KEY (plan_code) REFERENCES platform_plans(code)
);

CREATE INDEX IF NOT EXISTS idx_platform_plan_limits_plan
  ON platform_plan_limits(plan_code);

CREATE TABLE IF NOT EXISTS platform_feature_catalog (
  feature_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  global_enabled INTEGER NOT NULL DEFAULT 1 CHECK (global_enabled IN (0,1)),
  settings_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Importa recursos já utilizados pelas empresas sem recriá-los.
INSERT OR IGNORE INTO platform_feature_catalog (
  feature_key,name,description,global_enabled,settings_json,sort_order,created_at,updated_at
)
SELECT DISTINCT
  feature_key,
  feature_key,
  'Recurso importado da configuração existente.',
  1,
  '{}',
  0,
  datetime('now'),
  datetime('now')
FROM platform_features;

CREATE TABLE IF NOT EXISTS platform_plan_features (
  plan_code TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (plan_code, feature_key),
  FOREIGN KEY (plan_code) REFERENCES platform_plans(code),
  FOREIGN KEY (feature_key) REFERENCES platform_feature_catalog(feature_key)
);

CREATE TABLE IF NOT EXISTS platform_company_limit_overrides (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  limit_key TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'add' CHECK (mode IN ('add','set','cap')),
  limit_value INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  starts_at TEXT,
  expires_at TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_limit_overrides_company
  ON platform_company_limit_overrides(company_id, active, limit_key, expires_at);

CREATE TABLE IF NOT EXISTS platform_company_feature_overrides (
  company_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'inherit' CHECK (state IN ('inherit','allow','deny')),
  settings_json TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT,
  updated_by_user_id TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, feature_key),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (feature_key) REFERENCES platform_feature_catalog(feature_key),
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_feature_overrides_company
  ON platform_company_feature_overrides(company_id, feature_key, expires_at);

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL DEFAULT '{}',
  updated_by_user_id TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);

CREATE TABLE IF NOT EXISTS platform_auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  identifier_hash TEXT NOT NULL,
  ip_hash TEXT,
  success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_auth_attempts_lookup
  ON platform_auth_attempts(scope, identifier_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_auth_attempts_ip
  ON platform_auth_attempts(scope, ip_hash, created_at DESC);

-- Catálogo inicial de limites. NULL significa sem limite explícito.
INSERT OR IGNORE INTO platform_plan_limits (plan_code,limit_key,limit_value,updated_at)
SELECT code,'products_max',CASE WHEN code='free' THEN 50 ELSE NULL END,datetime('now') FROM platform_plans;
INSERT OR IGNORE INTO platform_plan_limits (plan_code,limit_key,limit_value,updated_at)
SELECT code,'listings_daily',CASE WHEN code='free' THEN 10 ELSE NULL END,datetime('now') FROM platform_plans;
INSERT OR IGNORE INTO platform_plan_limits (plan_code,limit_key,limit_value,updated_at)
SELECT code,'listings_monthly',CASE WHEN code='free' THEN 100 ELSE NULL END,datetime('now') FROM platform_plans;
INSERT OR IGNORE INTO platform_plan_limits (plan_code,limit_key,limit_value,updated_at)
SELECT code,'ai_daily',CASE WHEN code='free' THEN 5 ELSE NULL END,datetime('now') FROM platform_plans;
INSERT OR IGNORE INTO platform_plan_limits (plan_code,limit_key,limit_value,updated_at)
SELECT code,'ai_monthly',CASE WHEN code='free' THEN 50 ELSE NULL END,datetime('now') FROM platform_plans;
INSERT OR IGNORE INTO platform_plan_limits (plan_code,limit_key,limit_value,updated_at)
SELECT code,'users_max',CASE WHEN code='free' THEN 1 ELSE NULL END,datetime('now') FROM platform_plans;
INSERT OR IGNORE INTO platform_plan_limits (plan_code,limit_key,limit_value,updated_at)
SELECT code,'storage_bytes',CASE WHEN code='free' THEN 1073741824 ELSE NULL END,datetime('now') FROM platform_plans;
INSERT OR IGNORE INTO platform_plan_limits (plan_code,limit_key,limit_value,updated_at)
SELECT code,'bulk_max_per_job',CASE WHEN code='free' THEN 20 ELSE NULL END,datetime('now') FROM platform_plans;

-- Recursos conhecidos da plataforma. A configuração existente por empresa continua preservada.
INSERT OR IGNORE INTO platform_feature_catalog (feature_key,name,description,global_enabled,sort_order,created_at,updated_at) VALUES
('catalog','Catálogo','Produtos, categorias e estoque.',1,10,datetime('now'),datetime('now')),
('orders','Pedidos','Gestão de pedidos.',1,20,datetime('now'),datetime('now')),
('customers','Clientes','Gestão de clientes.',1,30,datetime('now'),datetime('now')),
('coupons','Cupons','Cupons e promoções.',1,40,datetime('now'),datetime('now')),
('custom_domain','Domínio próprio','Uso de domínio personalizado.',1,50,datetime('now'),datetime('now')),
('shipping','Fretes','Métodos e integrações de frete.',1,60,datetime('now'),datetime('now')),
('payments','Pagamentos','Provedores de pagamento.',1,70,datetime('now'),datetime('now')),
('reviews','Avaliações','Avaliações de produtos.',1,80,datetime('now'),datetime('now')),
('reports','Relatórios','Relatórios e indicadores.',1,90,datetime('now'),datetime('now')),
('api','API','Acesso à API da loja.',1,100,datetime('now'),datetime('now')),
('ai_catalog','IA para cadastro','Assistência de IA no cadastro.',1,110,datetime('now'),datetime('now')),
('ai_image_analysis','Análise de imagens','Análise de imagens por IA.',1,120,datetime('now'),datetime('now')),
('ai_description','Geração de descrição','Geração de títulos e descrições.',1,130,datetime('now'),datetime('now')),
('bulk_generation','Geração em massa','Operações em lote.',1,140,datetime('now'),datetime('now')),
('marketplace_mercadolivre','Mercado Livre','Integração futura com Mercado Livre.',0,200,datetime('now'),datetime('now')),
('marketplace_shopee','Shopee','Integração futura com Shopee.',0,210,datetime('now'),datetime('now')),
('marketplace_tiktok','TikTok Shop','Integração futura com TikTok Shop.',0,220,datetime('now'),datetime('now'));

-- Configurações globais básicas; valores podem ser alterados pelo Super Admin posteriormente.
INSERT OR IGNORE INTO platform_settings (setting_key,value_json,updated_at) VALUES
('platform_identity','{"name":"RADZ HUB"}',datetime('now')),
('registrations','{"enabled":true}',datetime('now')),
('maintenance','{"enabled":false}',datetime('now')),
('ai_global','{"enabled":false}',datetime('now'));
