PRAGMA foreign_keys = ON;

-- ============================================================
-- SALVATEX - BANCO D1
-- Schema inicial para pedidos e futura área administrativa.
-- ============================================================

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  platform_fee_percent REAL NOT NULL DEFAULT 0.01,
  platform_fee_minimum_cents INTEGER NOT NULL DEFAULT 15000,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO stores (
  id, slug, name, active,
  platform_fee_percent,
  platform_fee_minimum_cents,
  created_at, updated_at
) VALUES (
  'salvatex', 'salvatex', 'Salvatex Cortinas', 1,
  0.01, 15000,
  datetime('now'), datetime('now')
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'salvatex',
  order_number TEXT NOT NULL UNIQUE,
  client_reference TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 4,
  source TEXT NOT NULL DEFAULT 'loja_online',
  channel TEXT NOT NULL DEFAULT 'site',
  status TEXT NOT NULL DEFAULT 'aguardando_pagamento',
  stage TEXT NOT NULL DEFAULT 'pagamento',
  currency TEXT NOT NULL DEFAULT 'BRL',

  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_cpf TEXT,
  customer_json TEXT,
  delivery_json TEXT,
  freight_json TEXT,
  payment_json TEXT,
  antifraud_json TEXT,
  deadlines_json TEXT,
  totals_by_category_json TEXT,

  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  freight_cents INTEGER,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,

  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_store_created
  ON orders(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_email
  ON orders(customer_email);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  client_item_id TEXT,
  group_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  category TEXT NOT NULL DEFAULT 'outros',
  category_name TEXT,
  sale_type TEXT,
  configurator TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  details_json TEXT,
  data_json TEXT,
  snapshot_json TEXT,
  created_at TEXT NOT NULL,

  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product
  ON order_items(product_id);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL,

  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_events_order
  ON order_events(order_id, created_at DESC);

-- Cobrança futura da plataforma: 1% do faturamento ou R$150/mês.
CREATE TABLE IF NOT EXISTS platform_billing (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  reference_month TEXT NOT NULL,
  gross_sales_cents INTEGER NOT NULL DEFAULT 0,
  fee_percent REAL NOT NULL DEFAULT 0.01,
  minimum_fee_cents INTEGER NOT NULL DEFAULT 15000,
  amount_due_cents INTEGER NOT NULL DEFAULT 15000,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  external_charge_id TEXT,
  due_date TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  UNIQUE(store_id, reference_month),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);
