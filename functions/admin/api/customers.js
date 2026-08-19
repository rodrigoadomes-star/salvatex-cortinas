import { json, requireAdmin } from "./_auth.js";
export async function onRequestGet(context){
 const auth=await requireAdmin(context); if(!auth.ok)return auth.response;
 const storeId=auth.storeId;
 await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_store_memberships (
   store_id TEXT NOT NULL,
   customer_account_id TEXT NOT NULL,
   created_at TEXT NOT NULL,
   PRIMARY KEY(store_id,customer_account_id)
 )`).run();
 const rows=await context.env.DB.prepare(`WITH order_stats AS (
   SELECT lower(customer_email) email,MAX(customer_name) order_name,MAX(customer_phone) order_phone,COUNT(*) orders,SUM(total_cents) spent,MAX(created_at) last_order
   FROM orders WHERE store_id=?1 AND customer_email IS NOT NULL AND customer_email<>'' GROUP BY lower(customer_email)
 ), members AS (
   SELECT lower(a.email) email,a.id account_id,a.name,a.phone,a.created_at registered_at
   FROM customer_store_memberships m JOIN customer_accounts a ON a.id=m.customer_account_id
   WHERE m.store_id=?1
 ), emails AS (
   SELECT email FROM order_stats UNION SELECT email FROM members
 )
 SELECT e.email,COALESCE(NULLIF(m.name,''),s.order_name,'') name,COALESCE(NULLIF(m.phone,''),s.order_phone,'') phone,
        COALESCE(s.orders,0) orders,COALESCE(s.spent,0) spent,s.last_order,m.registered_at,
        CASE WHEN m.account_id IS NULL THEN 0 ELSE 1 END registered
 FROM emails e LEFT JOIN members m ON m.email=e.email LEFT JOIN order_stats s ON s.email=e.email
 ORDER BY COALESCE(s.spent,0) DESC,COALESCE(m.registered_at,s.last_order) DESC LIMIT 500`).bind(storeId).all();
 return json({ok:true,customers:rows.results||[]});
}
