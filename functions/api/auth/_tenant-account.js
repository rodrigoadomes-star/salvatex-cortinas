import { requirePublicStore } from '../_tenant.js';

export async function customerTenant(context,json){
  const tenant=await requirePublicStore(context,json);
  if(!tenant.ok)return tenant;
  await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_store_memberships (
    store_id TEXT NOT NULL,
    customer_account_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY(store_id,customer_account_id)
  )`).run();
  await context.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_customer_store_memberships_account ON customer_store_memberships(customer_account_id,store_id)').run();
  return tenant;
}

export async function ensureMembership(db,storeId,accountId){
  await db.prepare(`INSERT OR IGNORE INTO customer_store_memberships(store_id,customer_account_id,created_at) VALUES(?1,?2,?3)`).bind(storeId,accountId,new Date().toISOString()).run();
}

export async function hasMembership(db,storeId,accountId){
  const row=await db.prepare('SELECT 1 ok FROM customer_store_memberships WHERE store_id=?1 AND customer_account_id=?2 LIMIT 1').bind(storeId,accountId).first();
  return Boolean(row);
}
