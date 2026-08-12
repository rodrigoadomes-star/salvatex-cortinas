-- ============================================================
-- SALVATEX - ADMIN SCHEMA
-- Arquivo único para evoluções da área administrativa.
--
-- IMPORTANTE:
-- Execute somente comandos que ainda não foram aplicados no D1.
-- O SQLite/D1 não aceita ADD COLUMN repetido.
-- ============================================================

-- ============================================================
-- PÁGINAS DE PRODUTOS / VITRINES
-- ============================================================

ALTER TABLE pages
ADD COLUMN page_type TEXT NOT NULL DEFAULT 'conteudo';

ALTER TABLE pages
ADD COLUMN product_ids_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE pages
ADD COLUMN hero_image_url TEXT;

-- ============================================================
-- MEDIDAS VINCULADAS ÀS PÁGINAS
-- ============================================================

ALTER TABLE pages
ADD COLUMN measures_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE pages
ADD COLUMN custom_measure_url TEXT;
