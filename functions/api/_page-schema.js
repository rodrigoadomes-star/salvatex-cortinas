export async function ensurePageNavigationSchema(db){
  if(!db)return new Set();
  const info=await db.prepare('PRAGMA table_info(pages)').all();
  const columns=new Set((info.results||[]).map(r=>String(r.name||'')));
  const additions=[['page_type',"TEXT NOT NULL DEFAULT 'conteudo'"],['product_ids_json',"TEXT NOT NULL DEFAULT '[]'"],['hero_image_url','TEXT'],['measures_json',"TEXT NOT NULL DEFAULT '[]'"],['custom_measure_url','TEXT'],['nav_group',"TEXT NOT NULL DEFAULT 'oculto'"],['nav_order','INTEGER NOT NULL DEFAULT 100'],['menu_label',"TEXT NOT NULL DEFAULT ''"],['external_url','TEXT'],['nav_parent_id','TEXT'],['configurator_id','TEXT']];
  for(const [name,type] of additions){if(columns.has(name))continue;try{await db.prepare(`ALTER TABLE pages ADD COLUMN ${name} ${type}`).run();columns.add(name)}catch(error){const again=await db.prepare('PRAGMA table_info(pages)').all();if((again.results||[]).some(r=>String(r.name||'')===name))columns.add(name);else throw error}}
  return columns;
}
export function normalizeNavGroup(value){const v=String(value||'oculto').trim();if(['principal','rodape','oculto'].includes(v))return v;if(['cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(v))return 'principal';return 'oculto'}
export function legacyConfiguratorId(pageType){const type=String(pageType||'');return({configurador_wave:'wave',configurador_prega_macho:'prega-macho',configurador_ilhos:'cortina-varao',configurador_persiana:'persiana'})[type]||''}
export function normalizePageType(value){const type=String(value||'conteudo').trim();if(type.startsWith('configurador_'))return'configurador';return['conteudo','produtos','link','configurador'].includes(type)?type:'conteudo'}
export async function repairLegacyGenericPages(db,storeId){
  if(!db||!storeId)return;await ensurePageNavigationSchema(db);
  const rows=await db.prepare(`SELECT id,title,menu_label,page_type,nav_group,nav_parent_id,configurator_id,updated_at FROM pages WHERE store_id=?1 ORDER BY updated_at DESC`).bind(storeId).all();
  const normalized=[];
  for(const row of rows.results||[]){const rawType=String(row.page_type||'conteudo');const legacyId=legacyConfiguratorId(rawType);const normalizedType=normalizePageType(rawType);const normalizedNav=normalizeNavGroup(row.nav_group);const currentCfg=String(row.configurator_id||'');const nextCfg=currentCfg||legacyId;if(normalizedType!==rawType||normalizedNav!==String(row.nav_group||'oculto')||nextCfg!==currentCfg){await db.prepare(`UPDATE pages SET page_type=?1,nav_group=?2,configurator_id=?3 WHERE id=?4 AND store_id=?5`).bind(normalizedType,normalizedNav,nextCfg||null,row.id,storeId).run()}normalized.push({...row,page_type:normalizedType,nav_group:normalizedNav,configurator_id:nextCfg})}
  const visible=normalized.filter(r=>r.nav_group==='principal');const groups=new Map();for(const row of visible){const label=String(row.menu_label||row.title||'').trim().toLowerCase();const parent=String(row.nav_parent_id||'');if(!label)continue;const key=parent+'|'+label;const arr=groups.get(key)||[];arr.push(row);groups.set(key,arr)}
  for(const arr of groups.values()){if(arr.length<2)continue;arr.sort((a,b)=>{const ac=String(a.configurator_id||'')?1:0,bc=String(b.configurator_id||'')?1:0;if(ac!==bc)return bc-ac;return String(b.updated_at||'').localeCompare(String(a.updated_at||''))});for(const duplicate of arr.slice(1)){await db.prepare(`UPDATE pages SET nav_group='oculto' WHERE id=?1 AND store_id=?2`).bind(duplicate.id,storeId).run()}}
}
export function normalizeExternalUrl(value){const v=String(value||'').trim();if(!v)return'';if(v.startsWith('/')&&!v.startsWith('//'))return v.slice(0,1000);try{const u=new URL(v);return['https:','http:'].includes(u.protocol)?u.toString().slice(0,1000):''}catch{return''}}
