import { json, requireAdmin } from './_auth.js';

export async function requireFeature(context,featureKey){
  const auth=await requireAdmin(context);if(!auth.ok)return auth;
  const company=await context.env.DB.prepare(`SELECT company_id FROM platform_company_stores WHERE store_id=?1 LIMIT 1`).bind(auth.storeId).first();
  if(!company?.company_id)return{ok:false,response:json({ok:false,code:'COMPANY_NOT_FOUND',message:'Empresa não encontrada.'},404)};
  const row=await context.env.DB.prepare(`SELECT enabled FROM platform_features WHERE company_id=?1 AND feature_key=?2 LIMIT 1`).bind(company.company_id,String(featureKey)).first();
  if(!row||Number(row.enabled)!==1)return{ok:false,response:json({ok:false,code:'FEATURE_NOT_ENABLED',message:'Este recurso não está liberado para esta empresa.'},403)};
  return{...auth,ok:true,companyId:company.company_id};
}
