import { json, requireAdmin } from './_auth.js';

const DEFAULT_FEATURES=['catalog','orders','customers','site_builder','platform_subdomain'];

export async function onRequestGet(context){
  const auth=await requireAdmin(context);if(!auth.ok)return auth.response;
  try{
    const company=await context.env.DB.prepare(`SELECT pcs.company_id FROM platform_company_stores pcs WHERE pcs.store_id=?1 LIMIT 1`).bind(auth.storeId).first();
    if(!company?.company_id)return json({ok:false,code:'COMPANY_NOT_FOUND',message:'Empresa não encontrada.'},404);
    const rows=await context.env.DB.prepare(`SELECT feature_key,enabled,settings_json,updated_at FROM platform_features WHERE company_id=?1 ORDER BY feature_key`).bind(company.company_id).all();
    const features={};
    for(const key of DEFAULT_FEATURES)features[key]={enabled:true,settings:{}};
    for(const row of rows.results||[]){let settings={};try{settings=JSON.parse(row.settings_json||'{}')}catch{}features[row.feature_key]={enabled:Number(row.enabled)===1,settings,updatedAt:row.updated_at||null};}
    return json({ok:true,companyId:company.company_id,features});
  }catch(error){console.error('admin features',error);return json({ok:false,message:'Não foi possível carregar os recursos da empresa.'},500)}
}
