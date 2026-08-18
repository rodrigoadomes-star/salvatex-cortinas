import { json, requireAdmin, clean } from "../_auth.js";
export async function onRequestGet(context) {
  const auth=await requireAdmin(context); if(!auth.ok) return auth.response;
  const storeId=auth.storeId;
  const url=new URL(context.request.url); const q=clean(url.searchParams.get("q"),120); const status=clean(url.searchParams.get("status"),80); const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||50)));
  let sql=`SELECT o.id, o.order_number, o.customer_name, o.customer_email, o.customer_phone, o.status, o.stage, o.subtotal_cents, o.freight_cents, o.discount_cents, o.total_cents, o.internal_notes, o.created_at, o.updated_at, (SELECT COUNT(*) FROM orders seq WHERE seq.store_id=o.store_id AND (seq.created_at<o.created_at OR (seq.created_at=o.created_at AND seq.id<=o.id))) AS sale_number, (SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi WHERE oi.order_id=o.id) AS item_count FROM orders o WHERE o.store_id=?1`;
  const binds=[storeId];
  if(status){binds.push(status); sql+=` AND o.status=?${binds.length}`;}
  if(q){binds.push(`%${q}%`); sql+=` AND (o.order_number LIKE ?${binds.length} OR o.customer_name LIKE ?${binds.length} OR o.customer_email LIKE ?${binds.length} OR o.customer_phone LIKE ?${binds.length})`;}
  sql+=` ORDER BY o.created_at DESC LIMIT ${limit}`;
  const rows=await context.env.DB.prepare(sql).bind(...binds).all();
  return json({ok:true, orders:rows.results||[]});
}
