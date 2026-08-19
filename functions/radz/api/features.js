import { json, requireRadzAdmin } from './_auth.js';

const ALLOWED=new Set(['catalog','orders','customers','site_builder','platform_subdomain','configurator','ai_ads','meta_ads','payments','shipping','reports']);

export async function onRequestPatch(context){
  const auth=await requireRadzAdmin(context);if(!auth.ok)return auth.response;
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:'Dados inválidos.'},400)}
  const companyId=String(body.companyId||'').slice(0,120),featureKey=String(body.featureKey||'').trim().toLowerCase();
  const enabled=body.enabled===true||body.enabled===1||body.enabled==='1';
  if(!companyId||!ALLOWED.has(featureKey))return json({ok:false,message:'Recurso inválido.'},422);
  const company=await context.env.DB.prepare(`SELECT id FROM platform_companies WHERE id=?1 LIMIT 1`).bind(companyId).first();
  if(!company)return json({ok:false,message:'Empresa não encontrada.'},404);
  const now=new Date().toISOString();
  await context.env.DB.prepare(`INSERT INTO platform_features(company_id,feature_key,enabled,settings_json,updated_at) VALUES(?1,?2,?3,'{}',?4) ON CONFLICT(company_id,feature_key) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at`).bind(companyId,featureKey,enabled?1:0,now).run();
  await context.env.DB.prepare(`INSERT INTO platform_audit_logs(company_id,action,target_type,target_id,metadata_json,created_at) VALUES(?1,'platform.feature.updated','feature',?2,?3,?4)`).bind(companyId,featureKey,JSON.stringify({enabled}),now).run().catch(()=>{});
  return json({ok:true,companyId,featureKey,enabled});
}
