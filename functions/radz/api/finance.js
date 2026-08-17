import { json, requireRadzPermission, auditRadz } from './_auth.js';

function clampDays(value){return Math.max(1,Math.min(366,Number(value||30)));}
function cleanText(value,max=500){return String(value??'').trim().slice(0,max);}
function month(value){const v=cleanText(value,7);return /^\d{4}-\d{2}$/.test(v)?v:'';}
const STATUSES=new Set(['pending','paid','overdue','cancelled','refunded','waived']);

async function tableExists(db,name){try{return Boolean(await db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=?1 LIMIT 1").bind(name).first())}catch{return false}}
async function requireBillingTables(context){
  const ok=await tableExists(context.env.DB,'platform_billing')&&await tableExists(context.env.DB,'platform_billing_events');
  return ok?null:json({ok:false,code:'MIGRATION_REQUIRED',message:'A migration financeira ainda não foi aplicada.',migration:'database/migrations/20260817_radz_finance.sql'},409);
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
        b.id billing_id,b.payment_status,b.amount_cents,b.reference_month,b.due_at,b.paid_at,b.notes,b.updated_at
      FROM platform_companies c
      LEFT JOIN platform_company_profile p ON p.company_id=c.id
      LEFT JOIN platform_billing b ON b.id=(
        SELECT bx.id FROM platform_billing bx
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
    paidAt:x.paid_at||null,notes:x.notes||'',updatedAt:x.updated_at||null,
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
  const companyId=cleanText(body.companyId,100),referenceMonth=month(body.referenceMonth),status=cleanText(body.paymentStatus||'pending',20);
  const amountCents=Math.max(0,Math.trunc(Number(body.amountCents||0)));
  if(!companyId||!referenceMonth||!STATUSES.has(status))return json({ok:false,message:'Empresa, competência ou status inválido.'},400);
  const company=await context.env.DB.prepare("SELECT id FROM platform_companies WHERE id=?1 LIMIT 1").bind(companyId).first();
  if(!company)return json({ok:false,message:'Empresa não encontrada.'},404);
  const now=new Date().toISOString(),id=crypto.randomUUID(),actor=auth.session.user_id||null;
  const previous=await context.env.DB.prepare("SELECT id,payment_status FROM platform_billing WHERE company_id=?1 AND reference_month=?2 LIMIT 1").bind(companyId,referenceMonth).first();
  const billingId=previous?.id||id;
  const dueAt=body.dueAt?cleanText(body.dueAt,40):null,paidAt=status==='paid'?(body.paidAt?cleanText(body.paidAt,40):now):null;
  const notes=cleanText(body.notes,1000);
  const upsert=context.env.DB.prepare(`INSERT INTO platform_billing(id,company_id,reference_month,amount_cents,payment_status,due_at,paid_at,notes,created_by_user_id,updated_by_user_id,created_at,updated_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9,?10,?10)
    ON CONFLICT(company_id,reference_month) DO UPDATE SET amount_cents=excluded.amount_cents,payment_status=excluded.payment_status,due_at=excluded.due_at,paid_at=excluded.paid_at,notes=excluded.notes,updated_by_user_id=excluded.updated_by_user_id,updated_at=excluded.updated_at`)
    .bind(billingId,companyId,referenceMonth,amountCents,status,dueAt,paidAt,notes,actor,now);
  const event=context.env.DB.prepare(`INSERT INTO platform_billing_events(id,billing_id,company_id,actor_user_id,event_type,from_status,to_status,payload_json,created_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`).bind(crypto.randomUUID(),billingId,companyId,actor,previous?'billing_updated':'billing_created',previous?.payment_status||null,status,JSON.stringify({referenceMonth,amountCents,dueAt}),now);
  await context.env.DB.batch([upsert,event]);
  await auditRadz(context,auth,previous?'billing.updated':'billing.created','platform_billing',billingId,{companyId,referenceMonth,status,amountCents});
  return json({ok:true,billingId,companyId,referenceMonth,paymentStatus:status,amountCents});
}
