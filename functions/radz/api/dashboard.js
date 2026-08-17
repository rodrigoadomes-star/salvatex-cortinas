import { json, requireRadzAdmin } from "./_auth.js";

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") || 30)));
  const since = `-${days} days`;

  const [companies, plans, products, orders, users, domains, audit, billing] = await Promise.all([
    context.env.DB.prepare(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN c.status='active' AND COALESCE(p.access_blocked,0)=0 THEN 1 ELSE 0 END) active,
      SUM(CASE WHEN c.status='trial' THEN 1 ELSE 0 END) trial,
      SUM(CASE WHEN c.status='suspended' THEN 1 ELSE 0 END) suspended,
      SUM(CASE WHEN c.status='cancelled' THEN 1 ELSE 0 END) cancelled,
      SUM(CASE WHEN COALESCE(p.access_blocked,0)=1 THEN 1 ELSE 0 END) blocked
    FROM platform_companies c
    LEFT JOIN platform_company_profile p ON p.company_id=c.id
    WHERE p.deleted_at IS NULL OR p.deleted_at IS NULL`).first(),
    context.env.DB.prepare(`SELECT c.plan_code,COUNT(*) companies
      FROM platform_companies c
      LEFT JOIN platform_company_profile p ON p.company_id=c.id
      WHERE p.deleted_at IS NULL OR p.deleted_at IS NULL
      GROUP BY c.plan_code ORDER BY companies DESC`).all(),
    context.env.DB.prepare(`SELECT COUNT(*) total FROM products`).first(),
    context.env.DB.prepare(`SELECT COUNT(*) total FROM orders WHERE created_at>=datetime('now',?1)`).bind(since).first(),
    context.env.DB.prepare(`SELECT COUNT(*) total FROM platform_users WHERE active=1`).first(),
    context.env.DB.prepare(`SELECT
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed,
      SUM(CASE WHEN status IN ('pending','verifying') THEN 1 ELSE 0 END) pending
      FROM platform_domains`).first(),
    context.env.DB.prepare(`SELECT id,company_id,action,target_type,target_id,created_at
      FROM platform_audit_logs
      WHERE created_at>=datetime('now',?1)
      ORDER BY id DESC LIMIT 25`).bind(since).all(),
    context.env.DB.prepare(`SELECT
      SUM(CASE WHEN payment_status='pending' THEN 1 ELSE 0 END) pending,
      SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END) paid
      FROM platform_billing`).first().catch(() => ({ pending: 0, paid: 0 })),
  ]);

  return json({
    ok: true,
    periodDays: days,
    metrics: {
      companies: {
        total: Number(companies?.total || 0),
        active: Number(companies?.active || 0),
        trial: Number(companies?.trial || 0),
        suspended: Number(companies?.suspended || 0),
        cancelled: Number(companies?.cancelled || 0),
        blocked: Number(companies?.blocked || 0),
      },
      products: Number(products?.total || 0),
      orders: Number(orders?.total || 0),
      users: Number(users?.total || 0),
      domains: {
        failed: Number(domains?.failed || 0),
        pending: Number(domains?.pending || 0),
      },
      billing: {
        pending: Number(billing?.pending || 0),
        paid: Number(billing?.paid || 0),
      },
      storage: {
        tracked: false,
        bytes: null,
        note: "A medição persistente de R2 entra na fase de consumo/armazenamento; não é estimada no frontend.",
      },
      ai: {
        tracked: false,
        today: null,
        month: null,
        note: "O ledger de IA/consumo será adicionado na fase 3.",
      },
      listings: {
        tracked: false,
        today: null,
        month: null,
      },
    },
    companiesByPlan: plans.results || [],
    recentAudit: audit.results || [],
  });
}
