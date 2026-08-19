export async function ensureCustomerMembershipTable(db){
  if(!db)return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS customer_store_memberships (
    store_id TEXT NOT NULL,
    customer_account_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT,
    PRIMARY KEY(store_id, customer_account_id)
  )`).run();

  const info=await db.prepare('PRAGMA table_info(customer_store_memberships)').all();
  const columns=new Set((info.results||[]).map(row=>String(row.name||'')));
  if(!columns.has('last_login_at')){
    await db.prepare('ALTER TABLE customer_store_memberships ADD COLUMN last_login_at TEXT').run();
  }

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_customer_membership_account ON customer_store_memberships(customer_account_id, store_id)`).run();
}

export async function ensureCustomerMembership(db,storeId,accountId,{touchLogin=false}={}){
  await ensureCustomerMembershipTable(db);
  const now=new Date().toISOString();
  await db.prepare(`INSERT OR IGNORE INTO customer_store_memberships(store_id,customer_account_id,created_at,last_login_at) VALUES(?1,?2,?3,?4)`)
    .bind(String(storeId),String(accountId),now,touchLogin?now:null).run();
  if(touchLogin){
    await db.prepare(`UPDATE customer_store_memberships SET last_login_at=?3 WHERE store_id=?1 AND customer_account_id=?2`)
      .bind(String(storeId),String(accountId),now).run();
  }
}

export async function hasCustomerMembership(db,storeId,accountId){
  await ensureCustomerMembershipTable(db);
  const row=await db.prepare(`SELECT 1 ok FROM customer_store_memberships WHERE store_id=?1 AND customer_account_id=?2 LIMIT 1`)
    .bind(String(storeId),String(accountId)).first();
  return Boolean(row?.ok);
}
