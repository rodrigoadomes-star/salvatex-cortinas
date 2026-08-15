-- RADZ HUB: cadastro central de empresas (fase 1)
-- Esta migração é aditiva e não altera nem remove dados existentes da Salvatex.

CREATE TABLE IF NOT EXISTS platform_companies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE CHECK (length(cnpj) = 14),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_company_domains (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  hostname TEXT NOT NULL UNIQUE,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_platform_companies_cnpj ON platform_companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_platform_domains_company ON platform_company_domains(company_id);
