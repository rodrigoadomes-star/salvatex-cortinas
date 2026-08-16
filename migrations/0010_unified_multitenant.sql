-- Base incremental para arquitetura multiempresa unificada.
-- Não remove nem renomeia dados existentes.

CREATE TABLE IF NOT EXISTS platform_fee_history (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  fee_basis_points INTEGER NOT NULL CHECK (fee_basis_points BETWEEN 0 AND 10000),
  minimum_fee_cents INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  changed_by_user_id TEXT,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES platform_companies(id) ON DELETE CASCADE,
  FOREIGN KEY(changed_by_user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_fee_history_company_date
ON platform_fee_history(company_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS platform_password_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES platform_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_platform_password_tokens_user
ON platform_password_tokens(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_data_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  requester_email TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK(request_type IN ('access','correction','portability','deletion')),
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','completed','rejected')),
  notes TEXT NOT NULL DEFAULT '',
  due_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES platform_companies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_data_requests_status
ON platform_data_requests(status, created_at);

CREATE TABLE IF NOT EXISTS platform_backups (
  id TEXT PRIMARY KEY,
  backup_type TEXT NOT NULL,
  status TEXT NOT NULL,
  object_key TEXT,
  checksum TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS platform_domain_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  status_from TEXT,
  status_to TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(domain_id) REFERENCES platform_domains(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES platform_companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_domain_events_domain
ON platform_domain_events(domain_id, created_at DESC);
