import { json } from "../_lib.js";
import { requirePublicStore } from "../_tenant.js";
import { normalizePageType,normalizeNavGroup,legacyConfiguratorId,repairLegacyGenericPages } from '../_page-schema.js';
function parseJSON(value,fallback){try{return value?JSON.parse(value):fallback}catch{return fallback}}
function q(name){return `"${String(name).replaceAll('"','""')}"`}
function key(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function isProductHub(row){const keys=[row?.slug,row?.title,row?.menu_label].map(key);return keys.some(k=>['produtos','products','catalogo','catalog'].includes(k))}
async function configuratorEnabled(db,storeId){try{const row=await db.prepare(`SELECT pf.enabled FROM platform_company_stores pcs JOIN platform_features pf ON pf.company_id=pcs.company_id AND pf.feature_key='configurator' WHERE pcs.store_id=?1 LIMIT 1`).bind(storeId).first();return Number(row?.enabled)===1}catch{return false}}
async function configuratorLookup(db,storeId){
  const map=new Map();
  try{
    const r=await db.prepare(`SELECT config_key,value_json FROM store_configs WHERE store_id=?1 AND config_key LIKE 'configurator_%'`).bind(storeId).all();
    for(const row of r.results||[]){
      try{
        const c=JSON.parse(row.value_json||'{}');if(c.ativo===false)continue;
        const id=String(c.id||row.config_key.replace('configurator_','').replaceAll('_','-')).trim();if(!id)continue;
        [id,c.nome].map(key).filter(Boolean).forEach(k=>{if(!map.has(k))map.set(k,id)});
      }catch{}
    }
  }catch{}
  return map;
}
export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:'Banco indisponível'},503);
  const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;const storeId=tenant.storeId;
  try{
    await repairLegacyGenericPages(context.env.DB,storeId);
    const info=await context.env.DB.prepare('PRAGMA table_info(pages)').all(),columns=new Set((info.results||[]).map(row=>String(row.name||'')));
    if(!columns.has('id')||!columns.has('title')||!columns.has('slug'))return json({ok:false,message:'Estrutura de páginas incompleta'},500);
    const optional=(name,fallbackSql)=>columns.has(name)?q(name):`${fallbackSql} AS ${q(name)}`;
    const selected=[q('id'),q('title'),q('slug'),optional('page_type',"'conteudo'"),optional('hero_image_url',"''"),optional('measures_json',"'[]'"),optional('custom_measure_url',"''"),optional('nav_group',"'oculto'"),optional('nav_order','100'),optional('menu_label',"''"),optional('external_url',"''"),optional('nav_parent_id','NULL'),optional('configurator_id','NULL'),optional('active','1'),optional('updated_at','NULL')];
    const where=[],binds=[];if(columns.has('store_id')){where.push(`${q('store_id')}=?1`);binds.push(storeId)}if(columns.has('active'))where.push(`${q('active')}=1`);
    const order=columns.has('nav_order')?`${q('nav_order')} ASC, ${q('title')} ASC`:`${q('title')} ASC`,sql=`SELECT ${selected.join(',')} FROM pages${where.length?` WHERE ${where.join(' AND ')}`:''} ORDER BY ${order}`;
    let stmt=context.env.DB.prepare(sql);if(binds.length)stmt=stmt.bind(...binds);const result=await stmt.all(),allowConfigurator=await configuratorEnabled(context.env.DB,storeId),cfgLookup=allowConfigurator?await configuratorLookup(context.env.DB,storeId):new Map();
    const pages=(result.results||[]).map(row=>{
      const rawType=String(row.page_type||'conteudo');let configuratorId=String(row.configurator_id||legacyConfiguratorId(rawType)||'').trim();
      if(!configuratorId&&allowConfigurator&&!isProductHub(row)){
        const candidates=[row.slug,row.title,row.menu_label].map(key).filter(Boolean);
        for(const candidate of candidates){if(cfgLookup.has(candidate)){configuratorId=cfgLookup.get(candidate);break}}
      }
      const pageType=configuratorId?'configurador':normalizePageType(rawType);return{row,pageType,configuratorId};
    }).filter(x=>allowConfigurator||x.pageType!=='configurador').map(({row,pageType,configuratorId})=>({id:row.id,title:row.title,menuLabel:row.menu_label||row.title,slug:row.slug,pageType,configuratorId,heroImageUrl:row.hero_image_url||'',navGroup:normalizeNavGroup(row.nav_group||'oculto'),navOrder:Number(row.nav_order??100),navParentId:row.nav_parent_id||'',externalUrl:row.external_url||'',measures:parseJSON(row.measures_json,[]).map(measure=>({id:String(measure?.id||''),label:String(measure?.label||''),value:String(measure?.value||'')})).filter(measure=>measure.label),customMeasureUrl:row.custom_measure_url||''}));
    return json({ok:true,pages},200,{'Cache-Control':'no-store'});
  }catch(error){console.error('public pages list error',error);return json({ok:false,message:'Não foi possível carregar as páginas'},500)}
}
