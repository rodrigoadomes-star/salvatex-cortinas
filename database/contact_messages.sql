CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'salvatex',
  customer_account_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  responded_at TEXT,
  FOREIGN KEY(customer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(store_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(store_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_ip ON contact_messages(ip_hash,created_at DESC);

