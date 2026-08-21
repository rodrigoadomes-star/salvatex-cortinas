import { json, requireAdmin, clean, sanitizeHtml, slugify, logAdmin } from "../_auth.js";
import { ensurePageNavigationSchema,normalizeNavGroup,normalizeExternalUrl,normalizePageType,legacyConfiguratorId } from '../../../api/_page-schema.js';

function normalizeProductIds(value){if(!Array.isArray(value))return[];return[...new Set(value.map(v=>clean(v,160)).filter(Boolean))].slice(0,100)}
function normalizeMeasures(value){if(!Array.isArray(value))return[];return value.slice(0,30).map((m,index)=>({id:clean(m?.id,80)||`medida-${index+1}`,label:clean(m?.label,160),value:clean(m?.value,80),productIds:normalizeProductIds(m?.productIds)})).filter(m=>m.label)}
async function configuratorAllowed(db,storeId){const row=await db.prepare(`SELECT pf.enabled FROM platform_company_stores pcs JOIN platform_features pf ON pf.company_id=pcs.company_id AND pf.feature_key='configurator' WHERE pcs.store_id=?1 LIMIT 1`).bind(storeId).first();return Number(row?.enabled)===1}
async function uniqueSlug(db,storeId,value){const base=slugify(value)||`pagina-${crypto.randomUUID().slice(0,8)}`;for(let i=0;i<50;i++){const candidate=i?`${base}-${i+1}`:base;const row=await db.prepare('SELECT id FROM pages WHERE store_id=?1 AND slug=?2 LIMIT 1').bind(storeId,candidate).first();if(!row)return candidate}return `${base}-${crypto.randomUUID().slice(0,8)}`}
function requestedConfiguratorId(body){return clean(body.configuratorId||legacyConfiguratorId(body.pageType),80)}

export async function onRequestGet(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;const storeId=a.storeId;
  try{await ensurePageNavigationSchema(context.env.DB);const rows=await context.env.DB.prepare(`SELECT * FROM pages WHERE store_id=?1 ORDER BY nav_order ASC,updated_at DESC`).bind(storeId).all();return json({ok:true,pages:rows.results||[]})}
  catch(error){console.error('[pages list]',storeId,error);return json({ok:false,message:'Não foi possível carregar as páginas.'},500)}
}

export async function onRequestPost(context){
  const a=await requireAdmin(context);if(!a.ok)return a.response;const storeId=a.storeId,requestId=crypto.randomUUID().slice(0,10);
  let b={};try{b=await context.request.json()}catch{return json({ok:false,message:'JSON inválido.'},400)}
  const title=clean(b.title,240);if(!title)return json({ok:false,message:'Título obrigatório.'},400);
  const pageType=normalizePageType(b.pageType),configuratorId=requestedConfiguratorId(b);
  if(pageType==='configurador'){
    if(!await configuratorAllowed(context.env.DB,storeId))return json({ok:false,code:'FEATURE_NOT_ENABLED',message:'O configurador não está liberado para esta empresa.'},403);
    if(!configuratorId)return json({ok:false,message:'Selecione qual configurador esta página deve abrir.'},422);
  }
  const externalUrl=normalizeExternalUrl(b.externalUrl||b.customMeasureUrl);if(pageType==='link'&&!externalUrl)return json({ok:false,message:'Informe o destino do link.'},422);
  try{
    await ensurePageNavigationSchema(context.env.DB);
    const productIds=normalizeProductIds(b.productIds),measures=normalizeMeasures(b.measures),id=crypto.randomUUID(),now=new Date().toISOString(),slug=await uniqueSlug(context.env.DB,storeId,b.slug||title);
    if(productIds.length){const placeholders=productIds.map((_,i)=>`?${i+2}`).join(',');const found=await context.env.DB.prepare(`SELECT id FROM products WHERE store_id=?1 AND id IN (${placeholders})`).bind(storeId,...productIds).all();const valid=new Set((found.results||[]).map(x=>x.id));if(productIds.some(id=>!valid.has(id)))return json({ok:false,message:'Há produtos selecionados que não pertencem a esta loja.'},422)}
    await context.env.DB.prepare(`INSERT INTO pages(id,store_id,title,slug,content_html,seo_title,seo_description,active,page_type,product_ids_json,hero_image_url,measures_json,custom_measure_url,nav_group,nav_order,menu_label,external_url,nav_parent_id,configurator_id,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?20)`).bind(id,storeId,title,slug,sanitizeHtml(b.contentHtml),clean(b.seoTitle,240),clean(b.seoDescription,500),b.active===false?0:1,pageType,JSON.stringify(productIds),clean(b.heroImageUrl,1000)||null,JSON.stringify(measures),clean(b.customMeasureUrl,1000)||null,normalizeNavGroup(b.navGroup),Number.isFinite(Number(b.navOrder))?Math.round(Number(b.navOrder)):100,clean(b.menuLabel,120)||title,externalUrl||null,clean(b.navParentId,160)||null,configuratorId||null,now).run();
    await logAdmin(context.env.DB,'page_created','page',id,{title,pageType,configuratorId,slug},storeId);return json({ok:true,id,slug},201);
  }catch(error){console.error('[page create]',requestId,storeId,String(error?.message||error));return json({ok:false,message:`Não foi possível salvar a página. Referência: ${requestId}.`},500)}
}
