import { requirePlatformSession } from "./_auth.js";
import { json } from "./_lib.js";

export async function onRequestGet(context) {
  const auth = await requirePlatformSession(context);
  if (!auth.ok) return auth.response;
  const companyId = auth.session.company_id;
  if (!companyId) return json({ ok:false, code:"COMPANY_REQUIRED" }, 403);
  const [company, domains, features] = await Promise.all([
    context.env.DB.prepare(`SELECT c.id,c.slug,c.legal_name,c.trade_name,c.document_type,c.document_number,c.email,c.phone,c.segment,c.status,c.plan_code,c.platform_fee_basis_points,pcs.store_id
      FROM platform_companies c LEFT JOIN platform_company_stores pcs ON pcs.company_id=c.id WHERE c.id=?1`).bind(companyId).first(),
    context.env.DB.prepare(`SELECT id,hostname,domain_type,status,verification_method,verification_error,verified_at
      FROM platform_domains WHERE company_id=?1 ORDER BY CASE WHEN domain_type='platform_subdomain' THEN 0 ELSE 1 END, CASE WHEN status='active' THEN 0 WHEN status='pending' THEN 1 ELSE 2 END, created_at`).bind(companyId).all(),
    context.env.DB.prepare(`SELECT feature_key,enabled,settings_json FROM platform_features WHERE company_id=?1`).bind(companyId).all()
  ]);
  const list=domains.results||[];
  const platformDomain=list.find(d=>d.domain_type==='platform_subdomain'&&['active','pending','verifying'].includes(d.status));
  const activeDomain=list.find(d=>d.status==='active');
  const legacySalvatex=company?.store_id==='salvatex';
  const preferredHostname=platformDomain?.hostname||activeDomain?.hostname||(legacySalvatex?'salvatex.radzhub.com.br':company?.slug?`${company.slug}.radzhub.com.br`:'');
  return json({ ok:true, company:{...company,preferred_hostname:preferredHostname}, domains:list, features:features.results || [] });
}
