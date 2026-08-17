PRAGMA foreign_keys = ON;

-- Registro imutável de aceite jurídico por empresa/usuário.
-- Migração aditiva: não altera nem remove dados existentes.
CREATE TABLE IF NOT EXISTS platform_legal_acceptances (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  source TEXT NOT NULL DEFAULT 'signup',
  FOREIGN KEY (company_id) REFERENCES platform_companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES platform_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_platform_legal_acceptances_company
  ON platform_legal_acceptances(company_id, accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_legal_acceptances_user
  ON platform_legal_acceptances(user_id, accepted_at DESC);
