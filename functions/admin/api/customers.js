import { json, requireAdmin } from "./_auth.js";
export async function onRequestGet(context){
 const auth=await requireAdmin(context); if(!auth.ok)return auth.response;
 const rows=await context.env.DB.prepare(`SELECT customer_email email, MAX(customer_name) name, MAX(customer_phone) phone, COUNT(*) orders, SUM(total_cents) spent, MAX(created_at) last_order FROM orders WHERE store_id='salvatex' AND customer_email IS NOT NULL AND customer_email<>'' GROUP BY customer_email ORDER BY spent DESC LIMIT 500`).all();
 return json({ok:true,customers:rows.results||[]});
}
