-- Additive multi-tenant mapping between a public page/menu and one or more
-- configurators owned by the same store. Safe to run more than once.
CREATE TABLE IF NOT EXISTS page_configurators (
  page_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  configurator_id TEXT NOT NULL,
  menu_label TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (page_id, configurator_id),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_page_configurators_store_page
  ON page_configurators(store_id, page_id, sort_order);

