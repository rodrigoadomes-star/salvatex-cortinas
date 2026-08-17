import { requireAdmin, json } from './_auth.js';

function isoDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):null}
async function companyForRequest(db,request){
  const host=new URL(request.url).hostname.toLowerCase();
  const byDomain=await db.prepare(`SELECT d.company_id, pcs.store_id FROM platform_domains d LEFT JOIN platform_company_stores pcs ON pcs.company_id=d.company_id WHERE lower(d.hostname)=?1 AND d.status='active' LIMIT 1`).bind(host).first();
  if(byDomain?.company_id)return byDomain;
  return await db.prepare(`SELECT company_id,store_id FROM platform_company_stores WHERE company_id='company-salvatex' LIMIT 1`).first();
}
export async function onRequestGet(context){
  const auth=await requireAdmin(context); if(!auth.ok)return auth.response;
  const tenant=await companyForRequest(context.env.DB,context.request); if(!tenant?.company_id)return json({ok:false,code:'COMPANY_NOT_FOUND'},404);
  const u=new URL(context.request.url),today=new Date(),defaultFrom=new Date(today.getTime()-29*86400000).toISOString().slice(0,10);
  const from=isoDate(u.searchParams.get('from'))||defaultFrom,to=isoDate(u.searchParams.get('to'))||today.toISOString().slice(0,10);
  if(from>to)return json({ok:false,code:'INVALID_RANGE'},400);
  const [totals,unique,series,sources,pages,devices]=await Promise.all([
    context.env.DB.prepare(`SELECT COALESCE(SUM(page_views),0) page_views,COALESCE(SUM(product_views),0) product_views,COALESCE(SUM(add_to_cart),0) add_to_cart,COALESCE(SUM(checkout_started),0) checkout_started,COALESCE(SUM(orders),0) orders,COALESCE(SUM(revenue_cents),0) revenue_cents FROM platform_analytics_daily WHERE company_id=?1 AND event_date BETWEEN ?2 AND ?3`).bind(tenant.company_id,from,to).first(),
    context.env.DB.prepare(`SELECT COUNT(DISTINCT visitor_id) visitors,COUNT(DISTINCT session_id) sessions FROM platform_analytics_events WHERE company_id=?1 AND event_date BETWEEN ?2 AND ?3`).bind(tenant.company_id,from,to).first(),
    context.env.DB.prepare(`SELECT event_date,page_views,product_views,add_to_cart,checkout_started,orders,revenue_cents FROM platform_analytics_daily WHERE company_id=?1 AND event_date BETWEEN ?2 AND ?3 ORDER BY event_date`).bind(tenant.company_id,from,to).all(),
    context.env.DB.prepare(`SELECT COALESCE(NULLIF(utm_source,''),COALESCE(NULLIF(referrer_host,''),'direto')) source,COUNT(*) visits FROM platform_analytics_events WHERE company_id=?1 AND event_type='page_view' AND event_date BETWEEN ?2 AND ?3 GROUP BY source ORDER BY visits DESC LIMIT 12`).bind(tenant.company_id,from,to).all(),
    context.env.DB.prepare(`SELECT path,COUNT(*) views FROM platform_analytics_events WHERE company_id=?1 AND event_type='page_view' AND event_date BETWEEN ?2 AND ?3 GROUP BY path ORDER BY views DESC LIMIT 12`).bind(tenant.company_id,from,to).all(),
    context.env.DB.prepare(`SELECT COALESCE(NULLIF(device_type,''),'desconhecido') device,COUNT(*) visits FROM platform_analytics_events WHERE company_id=?1 AND event_type='page_view' AND event_date BETWEEN ?2 AND ?3 GROUP BY device ORDER BY visits DESC`).bind(tenant.company_id,from,to).all()
  ]);
  const pageViews=Number(totals?.page_views||0),orders=Number(totals?.orders||0);
  return json({ok:true,companyId:tenant.company_id,from,to,summary:{...totals,visitors:Number(unique?.visitors||0),sessions:Number(unique?.sessions||0),conversionRate:pageViews?Number(((orders/pageViews)*100).toFixed(2)):0},series:series.results||[],sources:sources.results||[],pages:pages.results||[],devices:devices.results||[]});
}
