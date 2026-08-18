import { json, requireAdmin, logAdmin } from "./_auth.js";
function normalizePlan(value){return String(value||'essencial').trim().toLowerCase()==='business'?'business':'essencial'}
function parse(v){try{return JSON.parse(v||'{}')}catch{return {}}}
export async function onRequestGet(context){
 const auth=await requireAdmin(context);if(!auth.ok)return auth.response;
 const storeId=auth.storeId,db=context.env.DB,month=new Date().toISOString().slice(0,7);
 const billing=await db.prepare(`SELECT s.platform_fee_minimum_cents,
   COALESCE(pc.platform_fee_basis_points,CAST(ROUND(s.platform_fee_percent*10000) AS INTEGER),100) fee_basis_points,
   COALESCE(pc.plan_code,'essencial') plan_code
   FROM stores s LEFT JOIN platform_company_stores pcs ON pcs.store_id=s.id LEFT JOIN platform_companies pc ON pc.id=pcs.company_id WHERE s.id=?1`).bind(storeId).first();
 const req=await db.prepare(`SELECT value_json,updated_at FROM store_configs WHERE store_id=?1 AND config_key='plan_upgrade_request'`).bind(storeId).first().catch(()=>null);
 const row=await db.prepare(`SELECT COALESCE(SUM(total_cents),0) gross FROM orders WHERE store_id=?1 AND substr(created_at,1,7)=?2 AND status NOT IN ('cancelado','reembolsado')`).bind(storeId,month).first();
 const gross=Number(row?.gross||0),basisPoints=Number(billing?.fee_basis_points??100),percent=basisPoints/10000,minimum=Number(billing?.platform_fee_minimum_cents||15000),calculated=Math.round(gross*percent),due=Math.max(minimum,calculated),planCode=normalizePlan(billing?.plan_code);
 return json({ok:true,referenceMonth:month,planCode,planName:planCode==='business'?'Business':'Essencial',feeBasisPoints:basisPoints,grossSalesCents:gross,feePercent:percent,minimumFeeCents:minimum,calculatedFeeCents:calculated,amountDueCents:due,upgradeRequest:req?{...parse(req.value_json),updatedAt:req.updated_at}:null,plans:{essencial:{name:'Essencial',features:['Loja completa','Produtos e configuradores','Pedidos e clientes','Visitas e conversão','Meta Pixel','Google Analytics 4','Google Ads','Google Tag Manager']},business:{name:'Business',features:['Tudo do Essencial','Meta Ads (Beta)','Conexão direta com conta de anúncios','Gestão avançada de campanhas no RADZ','Recursos avançados liberados conforme evolução da plataforma']}}});
}
export async function onRequestPost(context){
 const auth=await requireAdmin(context);if(!auth.ok)return auth.response;
 const storeId=auth.storeId,db=context.env.DB,now=new Date().toISOString();
 const current=await db.prepare(`SELECT COALESCE(pc.plan_code,'essencial') plan_code FROM platform_company_stores pcs LEFT JOIN platform_companies pc ON pc.id=pcs.company_id WHERE pcs.store_id=?1 LIMIT 1`).bind(storeId).first();
 if(normalizePlan(current?.plan_code)==='business')return json({ok:true,message:'Sua empresa já está no plano Business.'});
 const payload={requestedPlan:'business',status:'pending_review',requestedAt:now};
 await db.prepare(`INSERT INTO store_configs(store_id,config_key,value_json,updated_at) VALUES(?1,'plan_upgrade_request',?2,?3) ON CONFLICT(store_id,config_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).bind(storeId,JSON.stringify(payload),now).run();
 await logAdmin(db,'plan_upgrade_requested','store_config','plan_upgrade_request',payload,storeId);
 return json({ok:true,message:'Solicitação de upgrade enviada para análise.',upgradeRequest:payload});
}
