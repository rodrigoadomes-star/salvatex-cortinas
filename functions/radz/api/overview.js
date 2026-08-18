import { json, requireRadzAdmin } from "./_auth.js";

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;

  // Endpoint somente de leitura. Reparos/migrações não devem rodar a cada abertura
  // do Super Admin, pois isso adiciona escrita no D1 e aumenta o tempo de carregamento.
  const [domains, features, audit] = await Promise.all([
    context.env.DB.prepare(`SELECT d.id,d.company_id,d.hostname,d.domain_type,d.status,d.verification_method,d.verification_error,d.verified_at,d.created_at,c.trade_name
      FROM platform_domains d JOIN platform_companies c ON c.id=d.company_id
      ORDER BY CASE WHEN d.status='active' THEN 0 ELSE 1 END,d.created_at DESC LIMIT 200`).all(),
    context.env.DB.prepare(`SELECT f.company_id,f.feature_key,f.enabled,f.settings_json,f.updated_at,c.trade_name
      FROM platform_features f JOIN platform_companies c ON c.id=f.company_id
      ORDER BY c.trade_name,f.feature_key LIMIT 300`).all(),
    context.env.DB.prepare(`SELECT a.id,a.company_id,a.action,a.target_type,a.target_id,a.metadata_json,a.created_at,c.trade_name
      FROM platform_audit_logs a LEFT JOIN platform_companies c ON c.id=a.company_id
      ORDER BY a.id DESC LIMIT 100`).all()
  ]);

  return json(
    {ok:true,domains:domains.results||[],features:features.results||[],audit:audit.results||[]},
    200,
    {"Cache-Control":"private, no-store"}
  );
}
