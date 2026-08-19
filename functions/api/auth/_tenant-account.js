import { requirePublicStore } from '../_tenant.js';

const MEMBERSHIP_TABLE='customer_store_memberships_v2';

async function tableColumns(db,table){
  try{
    const info=await db.prepare(`PRAGMA table_info(${table})`).all();
    return new Set((info.results||[]).map(row=>String(row.name||'')));
  }catch{return new Set()}
}

export async function ensureMembershipSchema(db){
  if(!db)return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS ${MEMBERSHIP_TABLE} (
    store_id TEXT NOT NULL,
    customer_account_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT,
    PRIMARY KEY(store_id,customer_account_id)
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_customer_store_memberships_v2_account ON ${MEMBERSHIP_TABLE}(customer_account_id,store_id)`).run();

  // Best-effort migration from the legacy table. The legacy production table may
  // have a different schema/constraints, so never write to it during auth.
  const oldCols=await tableColumns(db,'customer_store_memberships');
  if(oldCols.has('store_id')&&oldCols.has('customer_account_id')){
    const createdExpr=oldCols.has('created_at')?"COALESCE(created_at,datetime('now'))":"datetime('now')";
    const loginExpr=oldCols.has('last_login_at')?'last_login_at':'NULL';
    try{
      await db.prepare(`INSERT OR IGNORE INTO ${MEMBERSHIP_TABLE}(store_id,customer_account_id,created_at,last_login_at)
        SELECT store_id,customer_account_id,${createdExpr},${loginExpr}
        FROM customer_store_memberships
        WHERE store_id IS NOT NULL AND customer_account_id IS NOT NULL`).run();
    }catch(error){
      console.warn('membership_legacy_migration_failed',error?.message||String(error));
    }
  }
}

export async function customerTenant(context,json){
  const tenant=await requirePublicStore(context,json);
  if(!tenant.ok)return tenant;
  await ensureMembershipSchema(context.env.DB);
  return tenant;
}

export async function ensureMembership(db,storeId,accountId,{touchLogin=true}={}){
  await ensureMembershipSchema(db);
  const now=new Date().toISOString();
  await db.prepare(`INSERT OR IGNORE INTO ${MEMBERSHIP_TABLE}(store_id,customer_account_id,created_at,last_login_at) VALUES(?1,?2,?3,?4)`)
    .bind(String(storeId),String(accountId),now,touchLogin?now:null).run();
  if(touchLogin){
    await db.prepare(`UPDATE ${MEMBERSHIP_TABLE} SET last_login_at=?3 WHERE store_id=?1 AND customer_account_id=?2`)
      .bind(String(storeId),String(accountId),now).run();
  }
}

export async function hasMembership(db,storeId,accountId){
  await ensureMembershipSchema(db);
  const row=await db.prepare(`SELECT 1 ok FROM ${MEMBERSHIP_TABLE} WHERE store_id=?1 AND customer_account_id=?2 LIMIT 1`)
    .bind(String(storeId),String(accountId)).first();
  return Boolean(row?.ok);
}
