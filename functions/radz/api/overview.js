import { json, requireRadzAdmin } from "./_auth.js";

async function repairLegacySalvatex(db){
  const now=new Date().toISOString();
  try{
    const link=await db.prepare(`SELECT pcs.company_id FROM platform_company_stores pcs WHERE pcs.store_id='salvatex' LIMIT 1`).first();
    if(!link?.company_id)return;
    const companyId=String(link.company_id);
    await db.batch([
      db.prepare(`UPDATE platform_companies SET slug='salvatex',updated_at=?2 WHERE id=?1 AND slug<>'salvatex'`).bind(companyId,now),
      db.prepare(`UPDATE platform_domains SET status='disabled',updated_at=?3 WHERE company_id=?1 AND hostname=?2 AND hostname<> 'salvatex.radzhub.com.br'`).bind(companyId,'salvatex-cortinas.pages.dev',now),
      db.prepare(`INSERT INTO platform_domains(id,company_id,hostname,domain_type,status,verification_method,verified_at,created_at,updated_at)
        VALUES('domain-salvatex-radzhub',?1,'salvatex.radzhub.com.br','platform_subdomain','active','platform',?2,?2,?2)
        ON CONFLICT(hostname) DO UPDATE SET company_id=excluded.company_id,domain_type='platform_subdomain',status='active',verification_method='platform',verified_at=COALESCE(platform_domains.verified_at,excluded.verified_at),updated_at=excluded.updated_at`).bind(companyId,now)
    ]);
  }catch(error){console.error('legacy salvatex domain repair',error);}
}

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  await repairLegacySalvatex(context.env.DB);
  const [domains, features, audit] = await Promise.all([
    context.env.DB.prepare(`SELECT d.id,d.company_id,d.hostname,d.domain_type,d.status,d.verification_method,d.verification_error,d.verified_at,d.created_at,c.trade_name
      FROM platform_domains d JOIN platform_companies c ON c.id=d.company_id ORDER BY CASE WHEN d.status='active' THEN 0 ELSE 1 END,d.created_at DESC LIMIT 500`).all(),
    context.env.DB.prepare(`SELECT f.company_id,f.feature_key,f.enabled,f.settings_json,f.updated_at,c.trade_name
      FROM platform_features f JOIN platform_companies c ON c.id=f.company_id ORDER BY c.trade_name,f.feature_key LIMIT 1000`).all(),
    context.env.DB.prepare(`SELECT a.id,a.company_id,a.action,a.target_type,a.target_id,a.metadata_json,a.created_at,c.trade_name
      FROM platform_audit_logs a LEFT JOIN platform_companies c ON c.id=a.company_id ORDER BY a.id DESC LIMIT 200`).all()
  ]);
  return json({ok:true,domains:domains.results||[],features:features.results||[],audit:audit.results||[]});
}
