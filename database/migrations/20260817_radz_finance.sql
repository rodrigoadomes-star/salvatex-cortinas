PRAGMA foreign_keys = ON;

-- RADZ HUB — camada financeira da plataforma.
-- Migration aditiva. Não altera nem remove registros existentes.

CREATE TABLE IF NOT EXISTS platform_billing (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  reference_month TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','overdue','cancelled','refunded','waived')),
  due_at TEXT,
  paid_at TEXT,
  provider_code TEXT,
  external_reference TEXT,
  notes TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_billing_company_month
  ON platform_billing(company_id, reference_month);
CREATE INDEX IF NOT EXISTS idx_platform_billing_status_due
  ON platform_billing(payment_status, due_at);
CREATE INDEX IF NOT EXISTS idx_platform_billing_company_updated
  ON platform_billing(company_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS platform_billing_events (
  id TEXT PRIMARY KEY,
  billing_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (billing_id) REFERENCES platform_billing(id),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_billing_events_bill
  ON platform_billing_events(billing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_billing_events_company
  ON platform_billing_events(company_id, created_at DESC);
