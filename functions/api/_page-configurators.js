const VALID_ID=/^[a-z0-9][a-z0-9-]{1,47}$/;

export async function ensurePageConfiguratorSchema(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS page_configurators (
    page_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    configurator_id TEXT NOT NULL,
    menu_label TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 100,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(page_id,configurator_id),
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_page_configurators_store_page ON page_configurators(store_id,page_id,sort_order)').run();
}

export function normalizeConfiguratorItems(value,fallbackId='',fallbackLabel=''){
  const source=Array.isArray(value)?value:[];
  const seen=new Set(),items=[];
  for(let index=0;index<source.length&&items.length<25;index++){
    const raw=source[index]||{},id=String(raw.configuratorId||raw.id||'').trim().toLowerCase();
    if(!VALID_ID.test(id)||seen.has(id))continue;
    seen.add(id);
    items.push({configuratorId:id,menuLabel:String(raw.menuLabel||raw.label||'').trim().slice(0,120),sortOrder:Number.isFinite(Number(raw.sortOrder))?Math.round(Number(raw.sortOrder)):((index+1)*10),active:raw.active===false?false:true});
  }
  const legacy=String(fallbackId||'').trim().toLowerCase();
  if(!items.length&&VALID_ID.test(legacy))items.push({configuratorId:legacy,menuLabel:String(fallbackLabel||'').trim().slice(0,120),sortOrder:10,active:true});
  return items;
}

export async function validateStoreConfigurators(db,storeId,items){
  if(!items.length)return true;
  const keys=items.map(item=>'configurator_'+item.configuratorId.replaceAll('-','_'));
  const placeholders=keys.map((_,index)=>`?${index+2}`).join(',');
  const rows=await db.prepare(`SELECT config_key,value_json FROM store_configs WHERE store_id=?1 AND config_key IN (${placeholders})`).bind(storeId,...keys).all();
  const found=new Set((rows.results||[]).filter(row=>{try{return JSON.parse(row.value_json||'{}')._deleted!==true}catch{return false}}).map(row=>String(row.config_key)));
  return keys.every(key=>found.has(key));
}

export async function replacePageConfigurators(db,storeId,pageId,items,now=new Date().toISOString()){
  await ensurePageConfiguratorSchema(db);
  const statements=[db.prepare('DELETE FROM page_configurators WHERE page_id=?1 AND store_id=?2').bind(pageId,storeId)];
  for(const item of items)statements.push(db.prepare(`INSERT INTO page_configurators(page_id,store_id,configurator_id,menu_label,sort_order,active,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?7)`).bind(pageId,storeId,item.configuratorId,item.menuLabel,item.sortOrder,item.active?1:0,now));
  await db.batch(statements);
}

export async function configuratorsByPage(db,storeId,pageIds,{activeOnly=false}={}){
  if(!pageIds.length)return new Map();
  await ensurePageConfiguratorSchema(db);
  const ids=[...new Set(pageIds.map(String))].slice(0,200),placeholders=ids.map((_,index)=>`?${index+2}`).join(',');
  const rows=await db.prepare(`SELECT page_id,configurator_id,menu_label,sort_order,active FROM page_configurators WHERE store_id=?1 AND page_id IN (${placeholders})${activeOnly?' AND active=1':''} ORDER BY page_id,sort_order,menu_label,configurator_id`).bind(storeId,...ids).all();
  const map=new Map();
  for(const row of rows.results||[]){const list=map.get(String(row.page_id))||[];list.push({configuratorId:String(row.configurator_id),menuLabel:String(row.menu_label||row.configurator_id),sortOrder:Number(row.sort_order||100),active:Number(row.active)===1});map.set(String(row.page_id),list)}
  return map;
}

