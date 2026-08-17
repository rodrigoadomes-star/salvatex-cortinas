import { json, requireRadzPermission, auditRadz } from './_auth.js';

function clampDays(value){return Math.max(1,Math.min(366,Number(value||30)));}
function cleanText(value,max=500){return String(value??'').trim().slice(0,max);}
function month(value){const v=cleanText(value,7);return /^\d{4}-\d{2}$/.test(v)?v:'';}
const STATUSES=new Set(['pending','paid','overdue','cancelled','refunded','waived']);

async function tableExists(db,name){try{return Boolean(await db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=?1 LIMIT 1").bind(name).first())}catch{return false}}
async function requireBillingTables(context){
  const ok=await tableExists(context.env.DB,'platform_company_billing')&&await tableExists(context.env.DB,'platform_company_billing_events');
  return ok?null:json({ok:false,code:'MIGRATION_REQUIRED',message:'A migration financeira ainda não foi aplicada.',migration:'database/migrations/20260817_radz_finance.sql'},409);
}

async function persistBilling(context,auth,input){
  const {companyId,referenceMonth,amountCents,status,dueAt,paidAt,notes,metadata={}}=input;
  const now=new Date().toISOString(),actor=auth.session.user_id||null;
  const previous=await context.env.DB.prepare("SELECT id,payment_status FROM platform_company_billing WHERE company_id=?1 AND reference_month=?2 LIMIT 1").bind(companyId,referenceMonth).first();
  const billingId=previous?.id||crypto.randomUUID();
  const upsert=context.env.DB.prepare(`INSERT INTO platform_company_billing(id,company_id,reference_month,amount_cents,payment_status,due_at,paid_at,notes,metadata_json,created_by_user_id,updated_by_user_id,created_at,updated_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10,?11,?11)
    ON CONFLICT(company_id,reference_month) DO UPDATE SET amount_cents=excluded.amount_cents,payment_status=excluded.payment_status,due_at=excluded.due_at,paid_at=excluded.paid_at,notes=excluded.notes,metadata_json=excluded.metadata_json,updated_by_user_id=excluded.updated_by_user_id,updated_at=excluded.updated_at`)
    .bind(billingId,companyId,referenceMonth,amountCents,status,dueAt,paidAt,notes,JSON.stringify(metadata),actor,now);
  const event=context.env.DB.prepare(`INSERT INTO platform_company_billing_events(id,billing_id,company_id,actor_user_id,event_type,from_status,to_status,payload_json,created_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`).bind(crypto.randomUUID(),billingId,companyId,actor,previous?'billing_updated':'billing_created',previous?.payment_status||null,status,JSON.stringify({referenceMonth,amountCents,dueAt,...metadata}),now);
  await context.env.DB.batch([upsert,event]);
  await auditRadz(context,auth,previous?'billing.updated':'billing.created','platform_company_billing',billingId,{companyId,referenceMonth,status,amountCents,source:metadata.source||'manual'});
  return {billingId};
}

async function calculateCompanyBilling(context,companyId,referenceMonth){
  const company=await context.env.DB.prepare(`SELECT c.id,c.platform_fee_basis_points,pcs.store_id,s.platform_fee_minimum_cents
    FROM platform_companies c
    JOIN platform_company_stores pcs ON pcs.company_id=c.id
    JOIN stores s ON s.id=pcs.store_id
    WHERE c.id=?1 LIMIT 1`).bind(companyId).first();
  if(!company)return null;
  const sales=await context.env.DB.prepare(`SELECT COALESCE(SUM(total_cents),0) gross
    FROM orders WHERE store_id=?1 AND substr(created_at,1,7)=?2 AND status NOT IN ('cancelado','reembolsado')`).bind(company.store_id,referenceMonth).first();
  const grossSalesCents=Number(sales?.gross||0);
  const feeBasisPoints=Math.max(0,Math.min(10000,Number(company.platform_fee_basis_points??100)));
  const minimumFeeCents=Math.max(0,Number(company.platform_fee_minimum_cents||0));
  const calculatedFeeCents=Math.round(grossSalesCents*feeBasisPoints/10000);
  const amountCents=Math.max(minimumFeeCents,calculatedFeeCents);
  return {amountCents,metadata:{source:'calculated',storeId:company.store_id,grossSalesCents,feeBasisPoints,minimumFeeCents,calculatedFeeCents}};
}

export async function onRequestGet(context){
  const auth=await requireRadzPermission(context,'platform.billing.read');
  if(!auth.ok)return auth.response;
  const migration=await requireBillingTables(context);if(migration)return migration;
  const url=new URL(context.request.url),days=clampDays(url.searchParams.get('days'));
  const since=`-${days} days`;

  const [companies,orders,billing,plans]=await Promise.all([
    context.env.DB.prepare(`SELECT COUNT(*) total,
      SUM(CASE WHEN c.status='active' THEN 1 ELSE 0 END) active,
      SUM(CASE WHEN c.status='trial' THEN 1 ELSE 0 END) trial,
      SUM(CASE WHEN c.status='suspended' THEN 1 ELSE 0 END) suspended
      FROM platform_companies c
      LEFT JOIN platform_company_profile p ON p.company_id=c.id
      WHERE p.deleted_at IS NULL`).first(),
    context.env.DB.prepare(`SELECT COUNT(*) orders,COALESCE(SUM(o.total_cents),0) gross_cents
      FROM orders o
      WHERE o.created_at>=datetime('now',?1)
        AND o.status NOT IN ('cancelado','reembolsado')`).bind(since).first(),
    context.env.DB.prepare(`SELECT c.id company_id,c.trade_name,c.plan_code,c.status,
        p.billing_due_at,
        b.id billing_id,b.payment_status,b.amount_cents,b.reference_month,b.due_at,b.paid_at,b.notes,b.metadata_json,b.updated_at
      FROM platform_companies c
      LEFT JOIN platform_company_profile p ON p.company_id=c.id
      LEFT JOIN platform_company_billing b ON b.id=(
        SELECT bx.id FROM platform_company_billing bx
        WHERE bx.company_id=c.id
        ORDER BY bx.reference_month DESC,bx.updated_at DESC LIMIT 1
      )
      WHERE p.deleted_at IS NULL
      ORDER BY CASE COALESCE(b.payment_status,'unknown') WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
               COALESCE(b.due_at,p.billing_due_at,'9999-12-31'),c.trade_name
      LIMIT 300`).all(),
    context.env.DB.prepare(`SELECT c.plan_code,COUNT(*) companies
      FROM platform_companies c LEFT JOIN platform_company_profile p ON p.company_id=c.id
      WHERE p.deleted_at IS NULL GROUP BY c.plan_code ORDER BY companies DESC`).all(),
  ]);

  const rows=(billing.results||[]).map(x=>({
    companyId:x.company_id,companyName:x.trade_name,planCode:x.plan_code,companyStatus:x.status,
    billingDueAt:x.billing_due_at,billingId:x.billing_id||null,paymentStatus:x.payment_status||'unknown',
    amountCents:Number(x.amount_cents||0),referenceMonth:x.reference_month||null,dueAt:x.due_at||null,
    paidAt:x.paid_at||null,notes:x.notes||'',metadata:x.metadata_json?JSON.parse(x.metadata_json):{},updatedAt:x.updated_at||null,
  }));

  return json({ok:true,periodDays:days,metrics:{
    companies:{total:Number(companies?.total||0),active:Number(companies?.active||0),trial:Number(companies?.trial||0),suspended:Number(companies?.suspended||0)},
    orders:Number(orders?.orders||0),grossCents:Number(orders?.gross_cents||0),
    pendingCompanies:rows.filter(x=>['pending','overdue'].includes(x.paymentStatus)).length,
    pendingAmountCents:rows.filter(x=>['pending','overdue'].includes(x.paymentStatus)).reduce((s,x)=>s+x.amountCents,0),
  },companiesByPlan:plans.results||[],billing:rows});
}

export async function onRequestPost(context){
  const auth=await requireRadzPermission(context,'platform.billing.write');if(!auth.ok)return auth.response;
  const migration=await requireBillingTables(context);if(migration)return migration;
  let body={};try{body=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const companyId=cleanText(body.companyId,100),referenceMonth=month(body.referenceMonth);
  if(!companyId||!referenceMonth)return json({ok:false,message:'Empresa e competência são obrigatórias.'},400);
  const company=await context.env.DB.prepare("SELECT id FROM platform_companies WHERE id=?1 LIMIT 1").bind(companyId).first();
  if(!company)return json({ok:false,message:'Empresa não encontrada.'},404);

  if(body.action==='calculate'){
    const calc=await calculateCompanyBilling(context,companyId,referenceMonth);
    if(!calc)return json({ok:false,message:'A empresa não possui loja vinculada para cálculo.'},409);
    const current=await context.env.DB.prepare("SELECT payment_status,due_at,paid_at,notes FROM platform_company_billing WHERE company_id=?1 AND reference_month=?2 LIMIT 1").bind(companyId,referenceMonth).first();
    const status=current?.payment_status||'pending';
    const result=await persistBilling(context,auth,{companyId,referenceMonth,amountCents:calc.amountCents,status,dueAt:current?.due_at||null,paidAt:current?.paid_at||null,notes:current?.notes||'Cobrança calculada pelo faturamento.',metadata:calc.metadata});
    return json({ok:true,...result,companyId,referenceMonth,paymentStatus:status,amountCents:calc.amountCents,calculation:calc.metadata});
  }

  const status=cleanText(body.paymentStatus||'pending',20);
  const amountCents=Math.max(0,Math.trunc(Number(body.amountCents||0)));
  if(!STATUSES.has(status)||!Number.isFinite(amountCents))return json({ok:false,message:'Valor ou status inválido.'},400);
  const now=new Date().toISOString();
  const dueAt=body.dueAt?cleanText(body.dueAt,40):null;
  const paidAt=status==='paid'?(body.paidAt?cleanText(body.paidAt,40):now):null;
  const notes=cleanText(body.notes,1000);
  const result=await persistBilling(context,auth,{companyId,referenceMonth,amountCents,status,dueAt,paidAt,notes,metadata:{source:'manual'}});
  return json({ok:true,...result,companyId,referenceMonth,paymentStatus:status,amountCents});
}
