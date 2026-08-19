import { json } from "../_lib.js";
import { requirePublicStore } from "../_tenant.js";
function parseJSON(value,fallback){try{return value?JSON.parse(value):fallback}catch{return fallback}}
function q(name){return `"${String(name).replaceAll('"','""')}"`}
async function configuratorEnabled(db,storeId){try{const row=await db.prepare(`SELECT pf.enabled FROM platform_company_stores pcs JOIN platform_features pf ON pf.company_id=pcs.company_id AND pf.feature_key='configurator' WHERE pcs.store_id=?1 LIMIT 1`).bind(storeId).first();return Number(row?.enabled)===1}catch{return false}}
export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:'Banco indisponível'},503);
  const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;const storeId=tenant.storeId;
  try{
    const info=await context.env.DB.prepare('PRAGMA table_info(pages)').all(),columns=new Set((info.results||[]).map(row=>String(row.name||'')));
    if(!columns.has('id')||!columns.has('title')||!columns.has('slug'))return json({ok:false,message:'Estrutura de páginas incompleta'},500);
    const optional=(name,fallbackSql)=>columns.has(name)?q(name):`${fallbackSql} AS ${q(name)}`;
    const selected=[q('id'),q('title'),q('slug'),optional('page_type',"'conteudo'"),optional('hero_image_url',"''"),optional('measures_json',"'[]'"),optional('custom_measure_url',"''"),optional('nav_group',"'oculto'"),optional('nav_order','100'),optional('menu_label',"''"),optional('external_url',"''"),optional('nav_parent_id','NULL'),optional('active','1'),optional('updated_at','NULL')];
    const where=[],binds=[];if(columns.has('store_id')){where.push(`${q('store_id')}=?1`);binds.push(storeId)}if(columns.has('active'))where.push(`${q('active')}=1`);
    const order=columns.has('nav_order')?`${q('nav_order')} ASC, ${q('title')} ASC`:`${q('title')} ASC`,sql=`SELECT ${selected.join(',')} FROM pages${where.length?` WHERE ${where.join(' AND ')}`:''} ORDER BY ${order}`;
    let stmt=context.env.DB.prepare(sql);if(binds.length)stmt=stmt.bind(...binds);const result=await stmt.all(),allowConfigurator=await configuratorEnabled(context.env.DB,storeId);
    const pages=(result.results||[]).filter(row=>allowConfigurator||!String(row.page_type||'').startsWith('configurador_')).map(row=>({id:row.id,title:row.title,menuLabel:row.menu_label||row.title,slug:row.slug,pageType:row.page_type||'conteudo',heroImageUrl:row.hero_image_url||'',navGroup:row.nav_group||'oculto',navOrder:Number(row.nav_order??100),navParentId:row.nav_parent_id||'',externalUrl:row.external_url||'',measures:parseJSON(row.measures_json,[]).map(measure=>({id:String(measure?.id||''),label:String(measure?.label||''),value:String(measure?.value||'')})).filter(measure=>measure.label),customMeasureUrl:row.custom_measure_url||''}));
    return json({ok:true,pages},200,{'Cache-Control':'no-store'});
  }catch(error){console.error('public pages list error',error);return json({ok:false,message:'Não foi possível carregar as páginas'},500)}
}
