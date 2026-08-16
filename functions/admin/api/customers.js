import { json, requireAdmin } from "./_auth.js";
export async function onRequestGet(context){
 const auth=await requireAdmin(context); if(!auth.ok)return auth.response;
 const rows=await context.env.DB.prepare(`WITH emails AS (
   SELECT lower(a.email) email FROM customer_accounts a JOIN customer_store_memberships m ON m.account_id=a.id WHERE m.store_id=?1 AND a.email IS NOT NULL AND a.email<>''
   UNION SELECT lower(customer_email) email FROM orders WHERE store_id=?1 AND customer_email IS NOT NULL AND customer_email<>''
 ), order_stats AS (
   SELECT lower(customer_email) email,MAX(customer_name) order_name,MAX(customer_phone) order_phone,COUNT(*) orders,SUM(total_cents) spent,MAX(created_at) last_order
   FROM orders WHERE store_id=?1 AND customer_email IS NOT NULL AND customer_email<>'' GROUP BY lower(customer_email)
 )
 SELECT e.email,COALESCE(NULLIF(a.name,''),s.order_name,'') name,COALESCE(NULLIF(a.phone,''),s.order_phone,'') phone,
        COALESCE(s.orders,0) orders,COALESCE(s.spent,0) spent,s.last_order,a.created_at registered_at,
        CASE WHEN a.id IS NULL THEN 0 ELSE 1 END registered
 FROM emails e LEFT JOIN customer_accounts a ON lower(a.email)=e.email AND EXISTS(SELECT 1 FROM customer_store_memberships m WHERE m.account_id=a.id AND m.store_id=?1) LEFT JOIN order_stats s ON s.email=e.email
 ORDER BY COALESCE(s.spent,0) DESC,COALESCE(a.created_at,s.last_order) DESC LIMIT 500`).bind(auth.storeId).all();
 return json({ok:true,customers:rows.results||[]});
}

