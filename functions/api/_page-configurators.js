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
    items.push({configuratorId:id,menuLabel:String(raw.menuLabel||raw.label||'').trim().slice(0,120),sortOrder:Number.isFinite(Number(raw.sortOrder))?Math.round(Number(raw.sortOrder)):((index+1)*10),active:raw.active===false?false:true,imageUrl:String(raw.imageUrl||'').trim().slice(0,1000)});
  }
  const legacy=String(fallbackId||'').trim().toLowerCase();
  if(!items.length&&VALID_ID.test(legacy))items.push({configuratorId:legacy,menuLabel:String(fallbackLabel||'').trim().slice(0,120),sortOrder:10,active:true,imageUrl:''});
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
  const resultRows=rows.results||[],configuratorIds=[...new Set(resultRows.map(row=>String(row.configurator_id)).filter(id=>VALID_ID.test(id)))],images=new Map();
  if(configuratorIds.length){
    const keys=configuratorIds.map(id=>'configurator_'+id.replaceAll('-','_')),keyPlaceholders=keys.map((_,index)=>`?${index+2}`).join(',');
    const configs=await db.prepare(`SELECT config_key,value_json FROM store_configs WHERE store_id=?1 AND config_key IN (${keyPlaceholders})`).bind(storeId,...keys).all();
    for(const row of configs.results||[]){try{const cfg=JSON.parse(row.value_json||'{}'),id=String(cfg.id||row.config_key.replace('configurator_','').replaceAll('_','-')),media=Array.isArray(cfg.midia)?cfg.midia:[],entry=media.find(item=>item&&item.ativo!==false&&(item.capa||item.imagem||item.imageUrl||(Array.isArray(item.imagens)&&item.imagens.length)));if(entry){const url=String(entry.capa||entry.imagem||entry.imageUrl||entry.imagens?.[0]||'').trim();if(url)images.set(id,url.slice(0,1000))}}catch{}}
    const missing=configuratorIds.filter(id=>!images.has(id));
    if(missing.length){const productPlaceholders=missing.map((_,index)=>`?${index+2}`).join(','),products=await db.prepare(`SELECT configurator,image_url FROM products WHERE store_id=?1 AND active=1 AND configurator IN (${productPlaceholders}) AND image_url IS NOT NULL AND image_url<>'' ORDER BY featured DESC,updated_at DESC`).bind(storeId,...missing).all();for(const row of products.results||[]){const id=String(row.configurator||''),url=String(row.image_url||'').trim();if(url&&!images.has(id))images.set(id,url.slice(0,1000))}}
  }
  const map=new Map();
  for(const row of resultRows){const id=String(row.configurator_id),list=map.get(String(row.page_id))||[];list.push({configuratorId:id,menuLabel:String(row.menu_label||id),sortOrder:Number(row.sort_order||100),active:Number(row.active)===1,imageUrl:images.get(id)||''});map.set(String(row.page_id),list)}
  return map;
}

