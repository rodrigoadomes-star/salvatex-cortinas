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
  const rows=await db.prepare(`SELECT id,title,slug,content_html,page_type,nav_group,configurator_id FROM pages WHERE store_id=?1`).bind(storeId).all();
  for(const row of rows.results||[]){
    const rawType=String(row.page_type||'conteudo');
    const genericType=normalizePageType(rawType);
    const legacyId=legacyConfiguratorId(rawType);
    const nav=normalizeNavGroup(row.nav_group);
    const slug=String(row.slug||'').toLowerCase();
    const emptyContent=!String(row.content_html||'').trim();
    let nextType=genericType;
    let nextCfg=String(row.configurator_id||legacyId||'');

    if(rawType==='conteudo'&&emptyContent&&['produtos','products','catalogo','catalog'].includes(slug))nextType='produtos';

    if(rawType==='conteudo'&&emptyContent&&['sob-medida','sob-medida-personalizado','personalizado','personalizados','configurador'].includes(slug)){
      try{
        const feature=await db.prepare(`SELECT pf.enabled FROM platform_company_stores pcs JOIN platform_features pf ON pf.company_id=pcs.company_id AND pf.feature_key='configurator' WHERE pcs.store_id=?1 LIMIT 1`).bind(storeId).first();
        if(Number(feature?.enabled)===1){
          const configs=await db.prepare(`SELECT config_key,value_json FROM store_configs WHERE store_id=?1 AND config_key LIKE 'configurator_%' ORDER BY updated_at DESC`).bind(storeId).all();
          const active=[];
          for(const c of configs.results||[]){try{const cfg=JSON.parse(c.value_json||'{}');if(cfg.ativo!==false)active.push(String(cfg.id||c.config_key.replace('configurator_','').replaceAll('_','-')))}catch{}}
          if(active.length){nextType='configurador';nextCfg=active[0]}
        }
      }catch{}
    }

    if(nextType!==rawType||nav!==String(row.nav_group||'oculto')||nextCfg!==String(row.configurator_id||'')){
      await db.prepare(`UPDATE pages SET page_type=?1,nav_group=?2,configurator_id=?3 WHERE id=?4 AND store_id=?5`).bind(nextType,nav,nextCfg||null,row.id,storeId).run();
    }
  }
}

export function normalizeExternalUrl(value){
  const v=String(value||'').trim();
  if(!v)return'';
  if(v.startsWith('/')&&!v.startsWith('//'))return v.slice(0,1000);
  try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.toString().slice(0,1000):''}catch{return''}
}
