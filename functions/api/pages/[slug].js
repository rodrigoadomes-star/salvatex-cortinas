import { json } from "../_lib.js";
import { requirePublicStore } from "../_tenant.js";
import { normalizePageType,legacyConfiguratorId } from '../_page-schema.js';
function parseJSON(value,fallback){try{return value?JSON.parse(value):fallback}catch{return fallback}}
function productPublic(row){return{id:row.id,categoryId:row.category_id,categoryName:row.category_name||"",categorySlug:row.category_slug||"",name:row.name,slug:row.slug,sku:row.sku||"",productType:row.product_type,saleType:row.sale_type,configurator:row.configurator||"",description:row.description||"",basePriceCents:Number(row.base_price_cents||0),comparePriceCents:row.compare_price_cents==null?null:Number(row.compare_price_cents),stock:row.stock==null?null:Number(row.stock),trackStock:Boolean(row.track_stock),featured:Boolean(row.featured),imageUrl:row.image_url||"",images:parseJSON(row.images_json,[]),options:parseJSON(row.options_json,{}),metadata:parseJSON(row.metadata_json,{})}}
function slugKey(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
async function configuratorEnabled(db,storeId){try{const row=await db.prepare(`SELECT pf.enabled FROM platform_company_stores pcs JOIN platform_features pf ON pf.company_id=pcs.company_id AND pf.feature_key='configurator' WHERE pcs.store_id=?1 LIMIT 1`).bind(storeId).first();return Number(row?.enabled)===1}catch{return false}}
async function findConfiguratorByPage(db,storeId,page){
  const direct=String(page.configurator_id||legacyConfiguratorId(page.page_type)||'');if(direct)return direct;
  const wanted=new Set([slugKey(page.slug),slugKey(page.title),slugKey(page.menu_label)].filter(Boolean));if(!wanted.size)return'';
  try{const rows=await db.prepare(`SELECT config_key,value_json FROM store_configs WHERE store_id=?1 AND config_key LIKE 'configurator_%' ORDER BY updated_at DESC`).bind(storeId).all();for(const row of rows.results||[]){try{const cfg=parseJSON(row.value_json,{});if(cfg.ativo===false)continue;const id=String(cfg.id||row.config_key.replace('configurator_','').replaceAll('_','-'));const keys=[id,cfg.nome,cfg.name].map(slugKey).filter(Boolean);if(keys.some(k=>wanted.has(k)))return id}catch{}}}catch{}
  return'';
}
async function automaticProducts(db,storeId,page){
  const slug=slugKey(page.slug),title=slugKey(page.title);
  const common=`SELECT p.*,c.name category_name,c.slug category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id AND c.store_id=p.store_id WHERE p.store_id=?1 AND p.active=1`;
  if(['produtos','products','catalogo','catalog'].includes(slug)||['produtos','products','catalogo','catalog'].includes(title)){const r=await db.prepare(`${common} ORDER BY p.featured DESC,p.name ASC LIMIT 100`).bind(storeId).all();return (r.results||[]).map(productPublic)}
  const byCategory=await db.prepare(`${common} AND (LOWER(c.slug)=?2 OR LOWER(c.name)=?3) ORDER BY p.featured DESC,p.name ASC LIMIT 100`).bind(storeId,String(page.slug||'').toLowerCase(),String(page.title||'').toLowerCase()).all();return (byCategory.results||[]).map(productPublic)
}
export async function onRequestGet(context){
  if(!context.env.DB)return json({ok:false,message:"Banco indisponível"},503);const tenant=await requirePublicStore(context,json);if(!tenant.ok)return tenant.response;const storeId=tenant.storeId;
  const slug=String(context.params.slug||"").trim();if(!slug)return json({ok:false,message:"Página não informada"},400);
  try{
    const page=await context.env.DB.prepare(`SELECT * FROM pages WHERE store_id=?1 AND slug=?2 AND active=1 LIMIT 1`).bind(storeId,slug).first();if(!page)return json({ok:false,message:"Página não encontrada"},404);
    const rawType=String(page.page_type||'conteudo');
    const productHub=['produtos','products','catalogo','catalog'].includes(slugKey(page.slug))||['produtos','products','catalogo','catalog'].includes(slugKey(page.title));
    const matchedConfigurator=productHub?'':await findConfiguratorByPage(context.env.DB,storeId,page);
    const pageType=matchedConfigurator?'configurador':productHub?'produtos':normalizePageType(rawType);
    const configuratorId=pageType==='configurador'?matchedConfigurator:'';
    if(pageType==='configurador'&&!await configuratorEnabled(context.env.DB,storeId))return json({ok:false,code:'FEATURE_NOT_ENABLED',message:'Este recurso não está disponível nesta loja.'},404);
    const measuresRaw=parseJSON(page.measures_json,[]),pageIds=parseJSON(page.product_ids_json,[]).filter(Boolean),measureIds=Array.isArray(measuresRaw)?measuresRaw.flatMap(m=>Array.isArray(m?.productIds)?m.productIds:[]).filter(Boolean):[],ids=[...new Set([...pageIds,...measureIds].map(String))].slice(0,100);let products=[];
    if(pageType==='produtos'){
      if(productHub){products=await automaticProducts(context.env.DB,storeId,page)}
      else if(ids.length){const placeholders=ids.map((_,i)=>`?${i+2}`).join(',');const result=await context.env.DB.prepare(`SELECT p.*,c.name category_name,c.slug category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id AND c.store_id=p.store_id WHERE p.store_id=?1 AND p.active=1 AND p.id IN (${placeholders})`).bind(storeId,...ids).all();const byId=new Map((result.results||[]).map(x=>[String(x.id),x]));products=ids.map(id=>byId.get(String(id))).filter(Boolean).map(productPublic)}
      else products=await automaticProducts(context.env.DB,storeId,page);
    }
    const measures=(Array.isArray(measuresRaw)?measuresRaw:[]).map(m=>({id:String(m?.id||''),label:String(m?.label||''),value:String(m?.value||''),productIds:Array.isArray(m?.productIds)?m.productIds.map(String):[]})).filter(m=>m.label);
    return json({ok:true,page:{id:page.id,title:page.title,menuLabel:page.menu_label||page.title,slug:page.slug,pageType,configuratorId,contentHtml:page.content_html||'',seoTitle:page.seo_title||'',seoDescription:page.seo_description||'',heroImageUrl:page.hero_image_url||'',measures,customMeasureUrl:page.custom_measure_url||'',externalUrl:page.external_url||''},products});
  }catch(error){console.error('public page error',error);return json({ok:false,message:"Não foi possível carregar a página"},500)}
}
