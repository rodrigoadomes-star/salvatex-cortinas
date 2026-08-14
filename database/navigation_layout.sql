-- SALVATEX — organização do menu público
-- Execute uma única vez no D1.

ALTER TABLE pages
ADD COLUMN nav_group TEXT NOT NULL DEFAULT 'oculto';

ALTER TABLE pages
ADD COLUMN nav_order INTEGER NOT NULL DEFAULT 100;

-- Depois, abra cada página pelo Painel Admin e escolha:
-- Cortinas sob medida
-- Persianas sob medida
-- Pronta entrega
-- Não exibir no menu
