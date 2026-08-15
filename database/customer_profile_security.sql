ALTER TABLE customer_accounts ADD COLUMN cpf TEXT;
ALTER TABLE customer_accounts ADD COLUMN cpf_locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customer_accounts ADD COLUMN address_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE customer_accounts ADD COLUMN pending_email TEXT;
ALTER TABLE customer_accounts ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS customer_auth_tokens (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customer_auth_tokens_lookup ON customer_auth_tokens(token_hash,purpose,expires_at);

