PRAGMA foreign_keys = ON;

-- RADZ HUB — camada financeira da plataforma.
-- Migration aditiva. Não altera nem remove a tabela legada platform_billing,
-- que continua vinculada a store_id e pode conter dados históricos.

CREATE TABLE IF NOT EXISTS platform_company_billing (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_company_billing_month
  ON platform_company_billing(company_id, reference_month);
CREATE INDEX IF NOT EXISTS idx_platform_company_billing_status_due
  ON platform_company_billing(payment_status, due_at);
CREATE INDEX IF NOT EXISTS idx_platform_company_billing_updated
  ON platform_company_billing(company_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS platform_company_billing_events (
  id TEXT PRIMARY KEY,
  billing_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (billing_id) REFERENCES platform_company_billing(id),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_company_billing_events_bill
  ON platform_company_billing_events(billing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_company_billing_events_company
  ON platform_company_billing_events(company_id, created_at DESC);

-- Backfill não destrutivo da cobrança legada por loja para a empresa vinculada.
-- INSERT OR IGNORE torna a migration idempotente e preserva qualquer cobrança
-- já criada diretamente no novo modelo.
INSERT OR IGNORE INTO platform_company_billing(
  id,company_id,reference_month,amount_cents,payment_status,due_at,paid_at,
  provider_code,external_reference,notes,metadata_json,created_at,updated_at
)
SELECT
  'legacy-' || b.id,
  pcs.company_id,
  b.reference_month,
  COALESCE(b.amount_due_cents,0),
  CASE
    WHEN b.payment_status IN ('pending','paid','overdue','cancelled','refunded','waived') THEN b.payment_status
    ELSE 'pending'
  END,
  b.due_date,
  b.paid_at,
  NULL,
  b.external_charge_id,
  'Importado da cobrança legada por loja.',
  json_object(
    'legacyBillingId',b.id,
    'storeId',b.store_id,
    'grossSalesCents',COALESCE(b.gross_sales_cents,0),
    'feePercent',COALESCE(b.fee_percent,0),
    'minimumFeeCents',COALESCE(b.minimum_fee_cents,0),
    'paymentMethod',COALESCE(b.payment_method,'')
  ),
  b.created_at,
  b.updated_at
FROM platform_billing b
JOIN platform_company_stores pcs ON pcs.store_id=b.store_id;
