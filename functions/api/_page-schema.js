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
    ['nav_parent_id','TEXT']
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

export function normalizeExternalUrl(value){
  const v=String(value||'').trim();
  if(!v)return'';
  if(v.startsWith('/')&&!v.startsWith('//'))return v.slice(0,1000);
  try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.toString().slice(0,1000):''}catch{return''}
}
