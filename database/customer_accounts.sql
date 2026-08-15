PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS customer_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT,
  password_salt TEXT,
  password_iterations INTEGER,
  google_sub TEXT UNIQUE,
  picture TEXT,
  provider TEXT NOT NULL DEFAULT 'password',
  email_verified INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email);
CREATE TABLE IF NOT EXISTS customer_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_login_attempts_key_time ON customer_login_attempts(key_hash,created_at);
ALTER TABLE orders ADD COLUMN customer_account_id TEXT REFERENCES customer_accounts(id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_account ON orders(customer_account_id,created_at DESC);

