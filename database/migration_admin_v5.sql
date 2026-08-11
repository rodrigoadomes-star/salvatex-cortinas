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
