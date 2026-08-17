import { json, requireAdmin, parseJson } from "./_auth.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (!auth.ok) return auth.response;
  const db = context.env.DB;
  const storeId = auth.storeId;
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  const month = now.toISOString().slice(0,7);
  const since = new Date(now.getTime() - 29*86400000).toISOString().slice(0,10);

  const [todayRow, monthRow, allRow, statuses, revenue, recent, topProducts] = await Promise.all([
    db.prepare(`SELECT COUNT(*) pedidos, COALESCE(SUM(total_cents),0) total FROM orders WHERE store_id=?1 AND substr(created_at,1,10)=?2`).bind(storeId,today).first(),
    db.prepare(`SELECT COUNT(*) pedidos, COALESCE(SUM(total_cents),0) total FROM orders WHERE store_id=?1 AND substr(created_at,1,7)=?2`).bind(storeId,month).first(),
    db.prepare(`SELECT COUNT(*) pedidos, COALESCE(SUM(total_cents),0) total FROM orders WHERE store_id=?1`).bind(storeId).first(),
    db.prepare(`SELECT status, COUNT(*) quantidade FROM orders WHERE store_id=?1 GROUP BY status ORDER BY quantidade DESC`).bind(storeId).all(),
    db.prepare(`SELECT substr(created_at,1,10) dia, COALESCE(SUM(total_cents),0) total FROM orders WHERE store_id=?1 AND substr(created_at,1,10)>=?2 GROUP BY dia ORDER BY dia`).bind(storeId,since).all(),
    db.prepare(`SELECT id, order_number, customer_name, customer_email, status, stage, total_cents, created_at FROM orders WHERE store_id=?1 ORDER BY created_at DESC LIMIT 8`).bind(storeId).all(),
    db.prepare(`SELECT oi.name, oi.image, SUM(oi.quantity) vendas, SUM(oi.total_cents) faturamento FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.store_id=?1 GROUP BY oi.name, oi.image ORDER BY vendas DESC LIMIT 6`).bind(storeId).all()
  ]);

  const monthOrders = Number(monthRow?.pedidos || 0);
  const monthTotal = Number(monthRow?.total || 0);
  const ticket = monthOrders ? Math.round(monthTotal / monthOrders) : 0;
  return json({ ok:true, stats:{ salesToday:Number(todayRow?.total||0), ordersToday:Number(todayRow?.pedidos||0), averageTicket:ticket, monthRevenue:monthTotal, totalOrders:Number(allRow?.pedidos||0) }, statuses:statuses.results||[], revenue:revenue.results||[], recent:recent.results||[], topProducts:topProducts.results||[] });
}
