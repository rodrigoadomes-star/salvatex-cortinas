import { requirePublicStore } from '../_tenant.js';

export async function ensureMembershipSchema(db){
  if(!db)return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS customer_store_memberships (
    store_id TEXT NOT NULL,
    customer_account_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT,
    PRIMARY KEY(store_id,customer_account_id)
  )`).run();

  // Older production databases may not have last_login_at yet.
  // Keep migration best-effort so login never fails only because of this optional field.
  try{
    const info=await db.prepare('PRAGMA table_info(customer_store_memberships)').all();
    const columns=new Set((info.results||[]).map(row=>String(row.name||'')));
    if(!columns.has('last_login_at')){
      await db.prepare('ALTER TABLE customer_store_memberships ADD COLUMN last_login_at TEXT').run();
    }
  }catch(error){
    console.warn('membership_optional_migration_failed',error?.message||String(error));
  }

  try{
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_store_memberships_account ON customer_store_memberships(customer_account_id,store_id)').run();
  }catch(error){
    console.warn('membership_optional_index_failed',error?.message||String(error));
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

  // Use only the three original mandatory columns for maximum compatibility
  // with databases created before last_login_at existed.
  await db.prepare(`INSERT OR IGNORE INTO customer_store_memberships(store_id,customer_account_id,created_at) VALUES(?1,?2,?3)`)
    .bind(String(storeId),String(accountId),now).run();

  // last_login_at is useful metadata, but must never block authentication.
  if(touchLogin){
    try{
      await db.prepare('UPDATE customer_store_memberships SET last_login_at=?3 WHERE store_id=?1 AND customer_account_id=?2')
        .bind(String(storeId),String(accountId),now).run();
    }catch(error){
      console.warn('membership_last_login_touch_failed',error?.message||String(error));
    }
  }
}

export async function hasMembership(db,storeId,accountId){
  await ensureMembershipSchema(db);
  const row=await db.prepare('SELECT 1 ok FROM customer_store_memberships WHERE store_id=?1 AND customer_account_id=?2 LIMIT 1')
    .bind(String(storeId),String(accountId)).first();
  return Boolean(row?.ok);
}
