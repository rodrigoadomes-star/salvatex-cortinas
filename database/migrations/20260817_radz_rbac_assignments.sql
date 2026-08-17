PRAGMA foreign_keys = ON;

-- RADZ HUB — atribuições RBAC aditivas.
-- Mantém platform_users.role por compatibilidade e permite papéis adicionais
-- sem reconstruir a tabela existente nem alterar seu CHECK constraint.

CREATE TABLE IF NOT EXISTS platform_user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  role_code TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  assigned_by_user_id TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES platform_users(id),
  FOREIGN KEY (company_id) REFERENCES platform_companies(id),
  FOREIGN KEY (role_code) REFERENCES platform_roles(code),
  FOREIGN KEY (assigned_by_user_id) REFERENCES platform_users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_user_roles_unique
  ON platform_user_roles(user_id, COALESCE(company_id,''), role_code);
CREATE INDEX IF NOT EXISTS idx_platform_user_roles_lookup
  ON platform_user_roles(user_id, company_id, active, expires_at);

-- Papéis com permissões mínimas seguras.
INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'platform_support',code,datetime('now') FROM platform_permissions
WHERE code IN ('platform.support.impersonate');

INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'platform_finance',code,datetime('now') FROM platform_permissions
WHERE code IN ('platform.billing.read','platform.billing.write');

INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'company_manager',code,datetime('now') FROM platform_permissions
WHERE code IN (
  'company.products.write',
  'company.prices.write',
  'company.orders.read',
  'company.orders.write',
  'company.ai.use',
  'company.listings.generate',
  'company.finance.read'
);

INSERT OR IGNORE INTO platform_role_permissions(role_code,permission_code,updated_at)
SELECT 'company_support',code,datetime('now') FROM platform_permissions
WHERE code IN ('company.orders.read');

-- Backfill dos usuários existentes. Os papéis antigos continuam intactos.
INSERT OR IGNORE INTO platform_user_roles(
  id,user_id,company_id,role_code,active,created_at,updated_at
)
SELECT
  'role-' || u.id || '-' ||
    CASE u.role
      WHEN 'platform_owner' THEN 'platform_owner'
      WHEN 'platform_support' THEN 'platform_support'
      WHEN 'owner' THEN 'company_admin'
      WHEN 'manager' THEN 'company_manager'
      ELSE 'company_support'
    END,
  u.id,
  u.company_id,
  CASE u.role
    WHEN 'platform_owner' THEN 'platform_owner'
    WHEN 'platform_support' THEN 'platform_support'
    WHEN 'owner' THEN 'company_admin'
    WHEN 'manager' THEN 'company_manager'
    ELSE 'company_support'
  END,
  u.active,
  datetime('now'),
  datetime('now')
FROM platform_users u
WHERE u.role IN ('platform_owner','platform_support','owner','manager','staff');
