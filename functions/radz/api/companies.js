import { json, requireRadzAdmin } from "./_auth.js";
function normalizePlan(v){return String(v||'essencial').trim().toLowerCase()==='business'?'business':'essencial'}

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);if (!auth.ok) return auth.response;
  const result = await context.env.DB.prepare(`SELECT c.id,c.slug,c.legal_name,c.trade_name,
      CASE WHEN s.id='salvatex' AND (c.document_type IS NULL OR trim(c.document_type)='' OR upper(c.document_type)='PENDENTE_CONFIGURACAO') THEN 'CNPJ' ELSE c.document_type END document_type,
      CASE WHEN s.id='salvatex' AND (c.document_number IS NULL OR trim(c.document_number)='' OR upper(c.document_number)='PENDENTE_CONFIGURACAO') THEN '49787177000179' ELSE c.document_number END document_number,
      CASE WHEN s.id='salvatex' AND (c.email IS NULL OR trim(c.email)='' OR upper(c.email)='PENDENTE_CONFIGURACAO') THEN 'rodrigo.adurante@gmail.com' ELSE c.email END email,
      c.phone,c.segment,c.status,
      CASE WHEN lower(COALESCE(c.plan_code,''))='business' THEN 'business' ELSE 'essencial' END plan_code,
      c.platform_fee_basis_points,c.created_at,
      s.id store_id,s.active store_active,
      (SELECT sc.value_json FROM store_configs sc WHERE sc.store_id=s.id AND sc.config_key='plan_upgrade_request' LIMIT 1) upgrade_request_json,
      COALESCE((SELECT d.hostname FROM platform_domains d WHERE d.company_id=c.id AND d.domain_type='platform_subdomain' AND d.status IN ('active','pending','verifying') ORDER BY CASE WHEN d.status='active' THEN 0 WHEN d.status='verifying' THEN 1 ELSE 2 END,d.created_at LIMIT 1),(SELECT d.hostname FROM platform_domains d WHERE d.company_id=c.id AND d.status='active' ORDER BY d.created_at LIMIT 1),CASE WHEN s.id='salvatex' THEN 'salvatex.radzhub.com.br' ELSE c.slug||'.radzhub.com.br' END) preferred_hostname,
      (SELECT COUNT(*) FROM platform_domains d WHERE d.company_id=c.id AND d.status='active') active_domains,
      (SELECT COUNT(*) FROM platform_users u WHERE u.company_id=c.id AND u.active=1) active_users
    FROM platform_companies c LEFT JOIN platform_company_stores pcs ON pcs.company_id=c.id LEFT JOIN stores s ON s.id=pcs.store_id ORDER BY c.created_at DESC LIMIT 500`).all();
  return json({ ok:true, companies:(result.results||[]).map(c=>({...c,plan_code:normalizePlan(c.plan_code)})) });
}

export async function onRequestPatch(context) {
  const auth = await requireRadzAdmin(context);if (!auth.ok) return auth.response;
  let body;try { body=await context.request.json(); } catch { return json({ok:false,message:"Dados inválidos."},400); }
  const id=String(body.id||"").slice(0,100),allowedStatus=["pending_email","trial","active","suspended","cancelled"],status=allowedStatus.includes(body.status)?body.status:null;
  const plan=normalizePlan(body.planCode),fee=Math.max(0,Math.min(10000,Math.round(Number(body.platformFeeBasisPoints))));
  if(!id||!status||!Number.isFinite(fee)) return json({ok:false,message:"Configuração inválida."},422);
  const now=new Date().toISOString();
  const result=await context.env.DB.prepare(`UPDATE platform_companies SET status=?1,plan_code=?2,platform_fee_basis_points=?3,updated_at=?4 WHERE id=?5`).bind(status,plan,fee,now,id).run();
  if(!result.meta?.changes) return json({ok:false,message:"Empresa não encontrada."},404);
  if(plan==='business'){
    const store=await context.env.DB.prepare(`SELECT store_id FROM platform_company_stores WHERE company_id=?1 LIMIT 1`).bind(id).first().catch(()=>null);
    if(store?.store_id)await context.env.DB.prepare(`DELETE FROM store_configs WHERE store_id=?1 AND config_key='plan_upgrade_request'`).bind(store.store_id).run().catch(()=>{});
  }
  await context.env.DB.prepare(`INSERT INTO platform_audit_logs (company_id,action,target_type,target_id,metadata_json,created_at) VALUES (?1,'platform.company.updated','company',?1,?2,?3)`).bind(id,JSON.stringify({status,plan,fee}),now).run();
  return json({ok:true,planCode:plan});
}
