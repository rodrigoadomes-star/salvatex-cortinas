PRAGMA foreign_keys = ON;

-- Permissões de marketing/integrações da empresa.
-- Migration aditiva e idempotente; não altera dados operacionais existentes.
INSERT OR IGNORE INTO platform_permissions(code,name,description,scope,created_at) VALUES
('company.integrations.read','Ver integrações','Visualizar configurações públicas de marketing e integrações da própria empresa.','company',datetime('now')),
('company.integrations.write','Editar integrações','Alterar Pixel, tags e iniciar conexões OAuth da própria empresa.','company',datetime('now'));

INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'company_admin',code,datetime('now') FROM platform_permissions
WHERE code IN ('company.integrations.read','company.integrations.write');

INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'company_manager',code,datetime('now') FROM platform_permissions
WHERE code IN ('company.integrations.read');
