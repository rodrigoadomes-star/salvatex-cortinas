export async function ensurePageNavigationSchema(db){
  if(!db)return new Set();
  const info=await db.prepare('PRAGMA table_info(pages)').all();
  const columns=new Set((info.results||[]).map(r=>String(r.name||'')));
  const additions=[
    ['page_type',"TEXT NOT NULL DEFAULT 'conteudo'"],
    ['product_ids_json',"TEXT NOT NULL DEFAULT '[]'"],
    ['hero_image_url','TEXT'],
    ['measures_json',"TEXT NOT NULL DEFAULT '[]'"],
    ['custom_measure_url','TEXT'],
    ['nav_group',"TEXT NOT NULL DEFAULT 'oculto'"],
    ['nav_order','INTEGER NOT NULL DEFAULT 100'],
    ['menu_label',"TEXT NOT NULL DEFAULT ''"],
    ['external_url','TEXT'],
    ['nav_parent_id','TEXT'],
    ['configurator_id','TEXT']
  ];
  for(const [name,type] of additions){
    if(columns.has(name))continue;
    try{await db.prepare(`ALTER TABLE pages ADD COLUMN ${name} ${type}`).run();columns.add(name)}catch(error){const again=await db.prepare('PRAGMA table_info(pages)').all();if((again.results||[]).some(r=>String(r.name||'')===name))columns.add(name);else throw error}
  }
  return columns;
}

export function normalizeNavGroup(value){
  const v=String(value||'oculto').trim();
  if(['principal','rodape','oculto'].includes(v))return v;
  if(['cortinas_sob_medida','persianas_sob_medida','pronta_entrega'].includes(v))return 'principal';
  return 'oculto';
}

export function legacyConfiguratorId(pageType){
  const type=String(pageType||'');
  return ({configurador_wave:'wave',configurador_prega_macho:'prega-macho',configurador_ilhos:'cortina-varao',configurador_persiana:'persiana'})[type]||'';
}

export function normalizePageType(value){
  const type=String(value||'conteudo').trim();
  if(type.startsWith('configurador_'))return 'configurador';
  return ['conteudo','produtos','link','configurador'].includes(type)?type:'conteudo';
}

export async function repairLegacyGenericPages(db,storeId){
  if(!db||!storeId)return;
  await ensurePageNavigationSchema(db);
  const rows=await db.prepare(`SELECT id,page_type,nav_group,configurator_id FROM pages WHERE store_id=?1`).bind(storeId).all();
  for(const row of rows.results||[]){
    const rawType=String(row.page_type||'conteudo');
    const legacyId=legacyConfiguratorId(rawType);
    const normalizedType=normalizePageType(rawType);
    const normalizedNav=normalizeNavGroup(row.nav_group);
    const currentCfg=String(row.configurator_id||'');
    const nextCfg=currentCfg||legacyId;
    if(normalizedType!==rawType||normalizedNav!==String(row.nav_group||'oculto')||nextCfg!==currentCfg){
      await db.prepare(`UPDATE pages SET page_type=?1,nav_group=?2,configurator_id=?3 WHERE id=?4 AND store_id=?5`).bind(normalizedType,normalizedNav,nextCfg||null,row.id,storeId).run();
    }
  }
}

export function normalizeExternalUrl(value){
  const v=String(value||'').trim();
  if(!v)return'';
  if(v.startsWith('/')&&!v.startsWith('//'))return v.slice(0,1000);
  try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.toString().slice(0,1000):''}catch{return''}
}
