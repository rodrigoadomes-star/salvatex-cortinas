import { json, requireRadzPermission } from './_auth.js';

function clampDays(value){return Math.max(1,Math.min(366,Number(value||30)));}

export async function onRequestGet(context){
  const auth=await requireRadzPermission(context,'platform.billing.read');
  if(!auth.ok)return auth.response;
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
        COALESCE(b.payment_status,'unknown') payment_status,
        COALESCE(b.amount_cents,0) amount_cents,
        b.reference_month,b.updated_at
      FROM platform_companies c
      LEFT JOIN platform_company_profile p ON p.company_id=c.id
      LEFT JOIN platform_billing b ON b.company_id=c.id
      WHERE p.deleted_at IS NULL
      ORDER BY CASE COALESCE(b.payment_status,'unknown') WHEN 'pending' THEN 0 WHEN 'overdue' THEN 1 ELSE 2 END,
               COALESCE(p.billing_due_at,'9999-12-31'),c.trade_name
      LIMIT 200`).all().catch(()=>({results:[]})),
    context.env.DB.prepare(`SELECT c.plan_code,COUNT(*) companies
      FROM platform_companies c LEFT JOIN platform_company_profile p ON p.company_id=c.id
      WHERE p.deleted_at IS NULL GROUP BY c.plan_code ORDER BY companies DESC`).all(),
  ]);

  const rows=(billing.results||[]).map(x=>({
    companyId:x.company_id,
    companyName:x.trade_name,
    planCode:x.plan_code,
    companyStatus:x.status,
    billingDueAt:x.billing_due_at,
    paymentStatus:x.payment_status,
    amountCents:Number(x.amount_cents||0),
    referenceMonth:x.reference_month||null,
    updatedAt:x.updated_at||null,
  }));

  return json({
    ok:true,
    periodDays:days,
    metrics:{
      companies:{total:Number(companies?.total||0),active:Number(companies?.active||0),trial:Number(companies?.trial||0),suspended:Number(companies?.suspended||0)},
      orders:Number(orders?.orders||0),
      grossCents:Number(orders?.gross_cents||0),
      pendingCompanies:rows.filter(x=>['pending','overdue'].includes(x.paymentStatus)).length,
      pendingAmountCents:rows.filter(x=>['pending','overdue'].includes(x.paymentStatus)).reduce((s,x)=>s+x.amountCents,0),
    },
    companiesByPlan:plans.results||[],
    billing:rows,
  });
}
