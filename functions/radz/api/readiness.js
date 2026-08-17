import { json, requireRadzAdmin } from './_auth.js';

const GROUPS={
  phase1:['platform_company_profile','platform_plans','platform_plan_limits','platform_feature_catalog','platform_plan_features','platform_company_limit_overrides','platform_company_feature_overrides','platform_settings','platform_auth_attempts'],
  advanced:['platform_categories','platform_attributes','platform_attribute_values','platform_category_attributes','platform_ai_settings','platform_usage_events','platform_generation_jobs','platform_layout_templates','platform_payment_providers','platform_company_payment_providers','platform_shipping_methods','platform_company_shipping_methods','platform_roles','platform_permissions','platform_role_permissions','platform_support_sessions','platform_media_objects','platform_media_references','platform_integrity_incidents'],
  rbac:['platform_user_roles'],
  finance:['platform_billing','platform_billing_events'],
};

async function existingTables(db){
  const rows=await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  return new Set((rows.results||[]).map(x=>x.name));
}

function groupStatus(tables,names){
  const missing=names.filter(x=>!tables.has(x));
  return {ready:missing.length===0,total:names.length,present:names.length-missing.length,missing};
}

export async function onRequestGet(context){
  const auth=await requireRadzAdmin(context,['platform_owner','platform_support']);
  if(!auth.ok)return auth.response;
  const tables=await existingTables(context.env.DB);
  const groups=Object.fromEntries(Object.entries(GROUPS).map(([k,v])=>[k,groupStatus(tables,v)]));
  const [companies,users,sessions,incidents,billing]=await Promise.all([
    context.env.DB.prepare("SELECT COUNT(*) total FROM platform_companies").first().catch(()=>({total:0})),
    context.env.DB.prepare("SELECT COUNT(*) total FROM platform_users WHERE company_id IS NULL AND active=1").first().catch(()=>({total:0})),
    context.env.DB.prepare("SELECT COUNT(*) total FROM platform_sessions WHERE company_id IS NULL AND expires_at>datetime('now')").first().catch(()=>({total:0})),
    tables.has('platform_integrity_incidents')?context.env.DB.prepare("SELECT COUNT(*) total FROM platform_integrity_incidents WHERE status IN ('open','acknowledged')").first():Promise.resolve({total:null}),
    tables.has('platform_billing')?context.env.DB.prepare("SELECT COUNT(*) total,SUM(CASE WHEN payment_status IN ('pending','overdue') THEN 1 ELSE 0 END) pending FROM platform_billing").first():Promise.resolve({total:null,pending:null}),
  ]);
  const schemaReady=Object.values(groups).every(x=>x.ready);
  return json({
    ok:true,
    ready:schemaReady&&Boolean(context.env.DB)&&Boolean(context.env.MEDIA),
    groups,
    bindings:{db:Boolean(context.env.DB),mediaR2:Boolean(context.env.MEDIA)},
    counts:{
      companies:Number(companies?.total||0),
      platformUsers:Number(users?.total||0),
      activePlatformSessions:Number(sessions?.total||0),
      openIntegrityIncidents:incidents?.total==null?null:Number(incidents.total||0),
      billingRecords:billing?.total==null?null:Number(billing.total||0),
      pendingBilling:billing?.pending==null?null:Number(billing.pending||0),
    },
    migrations:{
      phase1:'database/migrations/20260817_radz_super_admin_phase1.sql',
      advanced:'database/migrations/20260817_radz_super_admin_phase2_5.sql',
      rbac:'database/migrations/20260817_radz_rbac_assignments.sql',
      finance:'database/migrations/20260817_radz_finance.sql',
    },
    productionSafeToMerge:false,
    note:'Este diagnóstico confirma somente estrutura/bindings visíveis ao runtime. Isolamento autenticado, R2 real e fluxos financeiros ainda devem ser validados no Preview antes do merge.'
  });
}
