-- ============================================================
-- SALVATEX ADMIN 6.2 - PÁGINAS DE PRODUTOS EDITÁVEIS
-- Execute cada ALTER separadamente no Console D1 se necessário.
-- ============================================================

ALTER TABLE pages ADD COLUMN page_type TEXT NOT NULL DEFAULT 'conteudo';
ALTER TABLE pages ADD COLUMN product_ids_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE pages ADD COLUMN hero_image_url TEXT;
