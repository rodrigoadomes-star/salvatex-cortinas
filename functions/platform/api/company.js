import { requirePlatformSession } from "./_auth.js";
import { json } from "./_lib.js";
import { getEffectiveFeatures, getEffectiveLimits } from "./_entitlements.js";

export async function onRequestGet(context) {
  const auth = await requirePlatformSession(context);
  if (!auth.ok) return auth.response;
  const companyId = auth.session.company_id;
  if (!companyId) return json({ ok:false, code:"COMPANY_REQUIRED" }, 403);

  const [company, domains, features, limits] = await Promise.all([
    context.env.DB.prepare(`SELECT c.id,c.slug,c.legal_name,c.trade_name,c.document_type,c.document_number,c.email,c.phone,c.segment,c.status,c.plan_code,c.platform_fee_basis_points,
      COALESCE(p.access_blocked,0) access_blocked,p.trial_ends_at,p.billing_due_at,p.deleted_at
      FROM platform_companies c
      LEFT JOIN platform_company_profile p ON p.company_id=c.id
      WHERE c.id=?1`).bind(companyId).first(),
    context.env.DB.prepare(`SELECT id,hostname,domain_type,status,verification_method,verification_error,verified_at
      FROM platform_domains WHERE company_id=?1 ORDER BY created_at`).bind(companyId).all(),
    getEffectiveFeatures(context.env.DB, companyId),
    getEffectiveLimits(context.env.DB, companyId),
  ]);

  if (!company || company.deleted_at || company.access_blocked) {
    return json({ ok:false, code:"COMPANY_BLOCKED", message:"A empresa está indisponível no momento." }, 403);
  }

  return json({ ok:true, company:{...company,access_blocked:Boolean(company.access_blocked)}, domains:domains.results || [], features, limits });
}
