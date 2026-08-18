import {json} from './_auth.js';
import {resolveStore} from './_tenant.js';

function normalizePlan(value){const p=String(value||'essencial').trim().toLowerCase();return p==='business'?'business':'essencial'}

export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:'Banco de dados não configurado.'},503);
  const store=await resolveStore(context);
  if(!store)return json({ok:false,message:'Empresa não identificada para este domínio.'},404);
  let planCode='essencial';
  try{
    const row=await context.env.DB.prepare(`SELECT COALESCE(pc.plan_code,'essencial') plan_code FROM platform_company_stores pcs LEFT JOIN platform_companies pc ON pc.id=pcs.company_id WHERE pcs.store_id=?1 LIMIT 1`).bind(store.id).first();
    planCode=normalizePlan(row?.plan_code);
  }catch{}
  return json({ok:true,store:{id:store.id,slug:store.slug,name:store.name,host:store.host},plan:{code:planCode,name:planCode==='business'?'Business':'Essencial'},features:{metaAds:planCode==='business'}});
}
