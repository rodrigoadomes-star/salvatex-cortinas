PRAGMA foreign_keys = ON;

-- RADZ HUB Super Admin — Fases 2 a 5
-- Migration aditiva e compatível. Não remove nem renomeia estruturas existentes.

CREATE TABLE IF NOT EXISTS platform_categories (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  rules_json TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (parent_id) REFERENCES platform_categories(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_categories_scope_slug
  ON platform_categories(COALESCE(company_id,''), slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_categories_company
  ON platform_categories(company_id, active, sort_order);

CREATE TABLE IF NOT EXISTS platform_attributes (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text','number','select','multiselect','boolean','color','range','unit')),
  unit TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_attributes_scope_code
  ON platform_attributes(COALESCE(company_id,''), code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_attributes_company
  ON platform_attributes(company_id, active, sort_order);

CREATE TABLE IF NOT EXISTS platform_attribute_values (
  id TEXT PRIMARY KEY,
  attribute_id TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (attribute_id) REFERENCES platform_attributes(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_attribute_values_unique
  ON platform_attribute_values(attribute_id, value) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_attribute_values_attribute
  ON platform_attribute_values(attribute_id, active, sort_order);

CREATE TABLE IF NOT EXISTS platform_category_attributes (
  category_id TEXT NOT NULL,
  attribute_id TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (category_id, attribute_id),
  FOREIGN KEY (category_id) REFERENCES platform_categories(id),
  FOREIGN KEY (attribute_id) REFERENCES platform_attributes(id)
);

CREATE TABLE IF NOT EXISTS platform_ai_settings (
  scope TEXT NOT NULL CHECK (scope IN ('global','company')),
  company_id TEXT,
  provider TEXT,
  model TEXT,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  prompt TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  language TEXT,
  tone TEXT,
  forbidden_words_json TEXT NOT NULL DEFAULT '[]',
  title_pattern TEXT,
  sku_prefix TEXT,
  timeout_ms INTEGER,
  temperature REAL,
  fallback_json TEXT NOT NULL DEFAULT '{}',
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_by_user_id TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, company_id),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_ai_settings_global
  ON platform_ai_settings(scope) WHERE scope='global';

CREATE TABLE IF NOT EXISTS platform_usage_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  usage_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  operation_id TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_usage_operation
  ON platform_usage_events(company_id, usage_type, operation_id);
CREATE INDEX IF NOT EXISTS idx_platform_usage_company_date
  ON platform_usage_events(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_platform_usage_type_date
  ON platform_usage_events(usage_type, created_at);

CREATE TABLE IF NOT EXISTS platform_generation_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','completed_with_errors','failed','cancelled')),
  requested_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  input_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_generation_jobs_operation
  ON platform_generation_jobs(company_id, operation_id);
CREATE INDEX IF NOT EXISTS idx_platform_generation_jobs_status
  ON platform_generation_jobs(company_id, status, created_at);

CREATE TABLE IF NOT EXISTS platform_layout_templates (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  preview_url TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_layout_code_version
  ON platform_layout_templates(code, version) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS platform_layout_access (
  layout_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('plan','company')),
  scope_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (layout_id, scope_type, scope_id),
  FOREIGN KEY (layout_id) REFERENCES platform_layout_templates(id)
);

CREATE TABLE IF NOT EXISTS platform_payment_providers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  environments_json TEXT NOT NULL DEFAULT '["production","sandbox"]',
  public_config_schema_json TEXT NOT NULL DEFAULT '{}',
  secret_requirements_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'available',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_company_payment_providers (
  company_id TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  environment TEXT NOT NULL DEFAULT 'production',
  public_config_json TEXT NOT NULL DEFAULT '{}',
  secret_binding_refs_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'not_configured',
  last_error TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, provider_code),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (provider_code) REFERENCES platform_payment_providers(code)
);

CREATE TABLE IF NOT EXISTS platform_shipping_methods (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  config_schema_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_company_shipping_methods (
  company_id TEXT NOT NULL,
  method_code TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  config_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'not_configured',
  last_error TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, method_code),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (method_code) REFERENCES platform_shipping_methods(code)
);

CREATE TABLE IF NOT EXISTS platform_roles (
  code TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('platform','company')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  system_role INTEGER NOT NULL DEFAULT 0 CHECK (system_role IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_permissions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL CHECK (scope IN ('platform','company')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_role_permissions (
  role_code TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (role_code, permission_code),
  FOREIGN KEY (role_code) REFERENCES platform_roles(code),
  FOREIGN KEY (permission_code) REFERENCES platform_permissions(code)
);

CREATE TABLE IF NOT EXISTS platform_support_sessions (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','revoked','expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ended_at TEXT,
  last_seen_at TEXT,
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_support_sessions_actor
  ON platform_support_sessions(actor_user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_platform_support_sessions_company
  ON platform_support_sessions(company_id, status, created_at);

CREATE TABLE IF NOT EXISTS platform_media_objects (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  store_id TEXT,
  object_key TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  width INTEGER,
  height INTEGER,
  checksum TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','trash','orphan','missing','failed')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  purge_after TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(object_key),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_media_company
  ON platform_media_objects(company_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_platform_media_checksum
  ON platform_media_objects(company_id, checksum);

CREATE TABLE IF NOT EXISTS platform_media_references (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'gallery',
  attribute_key TEXT,
  attribute_value TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (media_id) REFERENCES platform_media_objects(id),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_media_refs_entity
  ON platform_media_references(company_id, entity_type, entity_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_platform_media_refs_media
  ON platform_media_references(media_id, deleted_at);

CREATE TABLE IF NOT EXISTS platform_integrity_incidents (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','error','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','ignored')),
  entity_type TEXT,
  entity_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_integrity_status
  ON platform_integrity_incidents(status, severity, last_seen_at);

INSERT OR IGNORE INTO platform_payment_providers(code,name,updated_at) VALUES
('pix_manual','PIX manual',datetime('now')),
('mercado_pago','Mercado Pago',datetime('now')),
('stripe','Stripe',datetime('now'));

INSERT OR IGNORE INTO platform_shipping_methods(code,name,type,updated_at) VALUES
('pickup','Retirada','pickup',datetime('now')),
('fixed','Valor fixo','fixed',datetime('now')),
('free','Frete grátis','free',datetime('now')),
('carrier','Transportadora','carrier',datetime('now')),
('correios','Correios','integration',datetime('now'));

INSERT OR IGNORE INTO platform_roles(code,scope,name,description,system_role,created_at,updated_at) VALUES
('platform_owner','platform','Super Admin','Controle total da plataforma.',1,datetime('now'),datetime('now')),
('platform_support','platform','Suporte','Acesso de suporte controlado.',1,datetime('now'),datetime('now')),
('platform_finance','platform','Financeiro','Cobrança, planos e pagamentos.',1,datetime('now'),datetime('now')),
('company_admin','company','Administrador da empresa','Administração completa da própria empresa.',1,datetime('now'),datetime('now')),
('company_manager','company','Gerente','Gestão operacional da própria empresa.',1,datetime('now'),datetime('now')),
('company_catalog','company','Cadastro','Produtos, categorias e mídia.',1,datetime('now'),datetime('now')),
('company_sales','company','Vendas','Pedidos e vendas.',1,datetime('now'),datetime('now')),
('company_support','company','Atendimento','Clientes e atendimento.',1,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO platform_permissions(code,name,scope,created_at) VALUES
('platform.companies.write','Alterar empresas','platform',datetime('now')),
('platform.plans.write','Alterar planos','platform',datetime('now')),
('platform.features.write','Alterar recursos','platform',datetime('now')),
('platform.billing.read','Ver financeiro','platform',datetime('now')),
('platform.billing.write','Alterar financeiro','platform',datetime('now')),
('platform.support.impersonate','Entrar como administrador','platform',datetime('now')),
('company.products.write','Editar produtos','company',datetime('now')),
('company.products.delete','Excluir produtos','company',datetime('now')),
('company.prices.write','Alterar preços','company',datetime('now')),
('company.orders.read','Ver pedidos','company',datetime('now')),
('company.orders.write','Editar pedidos','company',datetime('now')),
('company.ai.use','Usar IA','company',datetime('now')),
('company.listings.generate','Gerar anúncios','company',datetime('now')),
('company.domain.write','Editar domínio','company',datetime('now')),
('company.finance.read','Acessar financeiro','company',datetime('now'));

INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'platform_owner',code,datetime('now') FROM platform_permissions WHERE scope='platform';
INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'company_admin',code,datetime('now') FROM platform_permissions WHERE scope='company';
INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'company_catalog',code,datetime('now') FROM platform_permissions WHERE code IN ('company.products.write','company.products.delete','company.prices.write','company.ai.use','company.listings.generate');
INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'company_sales',code,datetime('now') FROM platform_permissions WHERE code IN ('company.orders.read','company.orders.write','company.finance.read');
