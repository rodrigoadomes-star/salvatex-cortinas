import { json, requireAdmin, parseJson } from "./_auth.js";

export async function onRequestGet(context) {
  const auth = requireAdmin(context); if (!auth.ok) return auth.response;
  const db = context.env.DB;
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  const month = now.toISOString().slice(0,7);
  const since = new Date(now.getTime() - 29*86400000).toISOString().slice(0,10);

  const [todayRow, monthRow, allRow, statuses, revenue, recent, topProducts] = await Promise.all([
    db.prepare(`SELECT COUNT(*) pedidos, COALESCE(SUM(total_cents),0) total FROM orders WHERE store_id='salvatex' AND substr(created_at,1,10)=?1`).bind(today).first(),
    db.prepare(`SELECT COUNT(*) pedidos, COALESCE(SUM(total_cents),0) total FROM orders WHERE store_id='salvatex' AND substr(created_at,1,7)=?1`).bind(month).first(),
    db.prepare(`SELECT COUNT(*) pedidos, COALESCE(SUM(total_cents),0) total FROM orders WHERE store_id='salvatex'`).first(),
    db.prepare(`SELECT status, COUNT(*) quantidade FROM orders WHERE store_id='salvatex' GROUP BY status ORDER BY quantidade DESC`).all(),
    db.prepare(`SELECT substr(created_at,1,10) dia, COALESCE(SUM(total_cents),0) total FROM orders WHERE store_id='salvatex' AND substr(created_at,1,10)>=?1 GROUP BY dia ORDER BY dia`).bind(since).all(),
    db.prepare(`SELECT id, order_number, customer_name, customer_email, status, stage, total_cents, created_at FROM orders WHERE store_id='salvatex' ORDER BY created_at DESC LIMIT 8`).all(),
    db.prepare(`SELECT oi.name, oi.image, SUM(oi.quantity) vendas, SUM(oi.total_cents) faturamento FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.store_id='salvatex' GROUP BY oi.name, oi.image ORDER BY vendas DESC LIMIT 6`).all()
  ]);

  const monthOrders = Number(monthRow?.pedidos || 0);
  const monthTotal = Number(monthRow?.total || 0);
  const ticket = monthOrders ? Math.round(monthTotal / monthOrders) : 0;
  return json({ ok:true, stats:{ salesToday:Number(todayRow?.total||0), ordersToday:Number(todayRow?.pedidos||0), averageTicket:ticket, monthRevenue:monthTotal, totalOrders:Number(allRow?.pedidos||0) }, statuses:statuses.results||[], revenue:revenue.results||[], recent:recent.results||[], topProducts:topProducts.results||[] });
}
