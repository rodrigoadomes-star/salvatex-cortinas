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
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'salvatex',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(store_id, slug),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'salvatex',
  category_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sku TEXT,
  product_type TEXT NOT NULL DEFAULT 'pronta_entrega',
  sale_type TEXT NOT NULL DEFAULT 'pronta_entrega',
  configurator TEXT,
  description TEXT NOT NULL DEFAULT '',
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  compare_price_cents INTEGER,
  stock INTEGER,
  track_stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  images_json TEXT NOT NULL DEFAULT '[]',
  options_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(store_id, slug),
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, active, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'salvatex',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(store_id, slug),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'salvatex',
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value REAL NOT NULL DEFAULT 0,
  minimum_cents INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(store_id, code),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS store_configs (
  store_id TEXT NOT NULL,
  config_key TEXT NOT NULL,
  value_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (store_id, config_key),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL DEFAULT 'salvatex',
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(store_id, created_at DESC);

INSERT OR IGNORE INTO categories (id, store_id, name, slug, description, active, sort_order, created_at, updated_at)
VALUES
  ('cat-cortinas-sob-medida','salvatex','Cortinas sob medida','cortinas-sob-medida','Cortinas personalizadas por medida.',1,10,datetime('now'),datetime('now')),
  ('cat-persianas-sob-medida','salvatex','Persianas sob medida','persianas-sob-medida','Persianas personalizadas por medida.',1,20,datetime('now'),datetime('now')),
  ('cat-pronta-entrega','salvatex','Pronta entrega','pronta-entrega','Produtos com medidas e estoque definidos.',1,30,datetime('now'),datetime('now')),
  ('cat-acessorios','salvatex','Trilhos e acessórios','trilhos-acessorios','Trilhos, varões e acessórios.',1,40,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO store_configs (store_id, config_key, value_json, updated_at)
VALUES ('salvatex','site_config',
'{"whatsapp":"5544998793160","parcelas":10,"freteGratisMinimo":500,"producao":"5 a 10 dias úteis","entrega":"6 a 12 dias úteis após o envio","altura":{"calculoMaximo":3.2,"inicioAcrescimo":2.8,"acrescimoApos280":0.25},"barra":{"faixasSemAcrescimo":[{"ate":2.6,"tamanho":20},{"ate":2.7,"tamanho":15},{"ate":2.75,"tamanho":10},{"ate":2.8,"tamanho":5}],"acimaDe280":20},"instalacao":{"Varão Wave Deslizante - Aço Escovado":{"valorMetro":116,"minimo":116},"Varão Wave Deslizante - Branco":{"valorMetro":116,"minimo":116},"Varão Wave Deslizante - Cromado":{"valorMetro":95,"minimo":95},"Varão Wave Deslizante - Preto":{"valorMetro":116,"minimo":116},"Trilho Suíço - Branco":{"valorMetro":74,"minimo":85},"Varão Wave Deslizante Duplo - Cromado":{"valorMetro":163,"minimo":163},"Trilho Suíço Duplo - Branco":{"valorMetro":110,"minimo":110}},"cores":{"Gaze de Linho":["Branco","Bege","Cinza","Off White","Natural"],"Linho Damasco":["Natural","Branco","Bege","Off White","Grafite"]},"precos":{"Gaze de Linho":{"Sem forro":121,"Forro leve":142,"Forro Peletizado 50%":163,"Blackout 80%":173,"Blackout 100%":189},"Linho Damasco":{"Sem forro":158,"Forro leve":179,"Forro Peletizado 50%":221,"Blackout 80%":226,"Blackout 100%":247}}}', datetime('now'));
