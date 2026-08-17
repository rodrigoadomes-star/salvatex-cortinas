import { requirePlatformSession } from "./_auth.js";
import { json } from "./_lib.js";

export async function onRequestGet(context) {
  const auth = await requirePlatformSession(context);
  if (!auth.ok) return auth.response;
  const companyId = auth.session.company_id;
  if (!companyId) return json({ ok:false, code:"COMPANY_REQUIRED" }, 403);
  const [company, domains, features] = await Promise.all([
    context.env.DB.prepare(`SELECT id,slug,legal_name,trade_name,document_type,document_number,email,phone,segment,status,plan_code,platform_fee_basis_points
      FROM platform_companies WHERE id=?1`).bind(companyId).first(),
    context.env.DB.prepare(`SELECT id,hostname,domain_type,status,verification_method,verification_error,verified_at
      FROM platform_domains WHERE company_id=?1 ORDER BY created_at`).bind(companyId).all(),
    context.env.DB.prepare(`SELECT feature_key,enabled,settings_json FROM platform_features WHERE company_id=?1`).bind(companyId).all()
  ]);
  return json({ ok:true, company, domains:domains.results || [], features:features.results || [] });
}

