import { json, requireAdmin, clean } from "../_auth.js";
export async function onRequestGet(context) {
  const auth=requireAdmin(context); if(!auth.ok) return auth.response;
  const url=new URL(context.request.url); const q=clean(url.searchParams.get("q"),120); const status=clean(url.searchParams.get("status"),80); const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||50)));
  let sql=`SELECT id, order_number, customer_name, customer_email, customer_phone, status, stage, subtotal_cents, freight_cents, discount_cents, total_cents, created_at, updated_at FROM orders WHERE store_id='salvatex'`;
  const binds=[];
  if(status){binds.push(status); sql+=` AND status=?${binds.length}`;}
  if(q){binds.push(`%${q}%`); sql+=` AND (order_number LIKE ?${binds.length} OR customer_name LIKE ?${binds.length} OR customer_email LIKE ?${binds.length})`;}
  sql+=` ORDER BY created_at DESC LIMIT ${limit}`;
  const stmt=context.env.DB.prepare(sql); const rows=binds.length?await stmt.bind(...binds).all():await stmt.all();
  return json({ok:true, orders:rows.results||[]});
}
