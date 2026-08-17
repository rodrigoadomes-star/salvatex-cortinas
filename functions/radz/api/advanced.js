import { auditRadz, json, requireRadzAdmin } from './_auth.js';
import { clean, nowIso } from './_policy.js';

const ATTRIBUTE_TYPES = new Set(['text','number','select','multiselect','boolean','color','range','unit']);
const USAGE_TYPES = new Set(['product_created','variation_created','listing_created','ai_image_analysis','ai_text_generation','ai_command_interpretation','bulk_generation','storage_usage']);

function slug(value){return clean(value,120).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function bool(v){return v===true||v===1||v==='1'||v==='true';}
function obj(v,fallback={}){try{const x=typeof v==='string'?JSON.parse(v):v;return x&&typeof x==='object'?x:fallback}catch{return fallback}}
function page(url){const n=Math.max(1,Number(url.searchParams.get('page')||1));const size=Math.min(100,Math.max(1,Number(url.searchParams.get('pageSize')||50)));return {page:n,size,offset:(n-1)*size};}
async function bodyOf(req){try{return await req.json()}catch{return null}}
async function tableExists(db,name){const row=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1").bind(name).first();return Boolean(row)}
function missing(){return json({ok:false,code:'MIGRATION_REQUIRED',message:'A migration avançada do Super Admin ainda não foi aplicada neste D1.'},409)}

async function ensureAdvanced(db){return tableExists(db,'platform_categories')}

async function readCatalog(db,url){
  const companyId=clean(url.searchParams.get('companyId'),120)||null;
  const scope=url.searchParams.get('scope')||'all';
  let categoryWhere='deleted_at IS NULL', attributeWhere='deleted_at IS NULL';
  const binds=[];
  if(scope==='global'){categoryWhere+=' AND company_id IS NULL';attributeWhere+=' AND company_id IS NULL'}
  else if(scope==='company'&&companyId){categoryWhere+=' AND company_id=?1';attributeWhere+=' AND company_id=?1';binds.push(companyId)}
  else if(companyId){categoryWhere+=' AND (company_id IS NULL OR company_id=?1)';attributeWhere+=' AND (company_id IS NULL OR company_id=?1)';binds.push(companyId)}
  const cstmt=db.prepare(`SELECT * FROM platform_categories WHERE ${categoryWhere} ORDER BY COALESCE(company_id,''),sort_order,name`);
  const astmt=db.prepare(`SELECT * FROM platform_attributes WHERE ${attributeWhere} ORDER BY COALESCE(company_id,''),sort_order,name`);
  const [cats,attrs,vals,links]=await Promise.all([
    binds.length?cstmt.bind(...binds).all():cstmt.all(),
    binds.length?astmt.bind(...binds).all():astmt.all(),
    db.prepare(`SELECT v.* FROM platform_attribute_values v JOIN platform_attributes a ON a.id=v.attribute_id WHERE v.deleted_at IS NULL AND a.deleted_at IS NULL ORDER BY v.attribute_id,v.sort_order,v.label`).all(),
    db.prepare(`SELECT ca.* FROM platform_category_attributes ca JOIN platform_categories c ON c.id=ca.category_id JOIN platform_attributes a ON a.id=ca.attribute_id WHERE c.deleted_at IS NULL AND a.deleted_at IS NULL ORDER BY ca.category_id,ca.sort_order`).all(),
  ]);
  return {categories:cats.results||[],attributes:attrs.results||[],values:vals.results||[],links:links.results||[]};
}

async function readAi(db,url){
  const companyId=clean(url.searchParams.get('companyId'),120)||null;
  const {size,offset,page:current}=page(url);
  const days=Math.min(366,Math.max(1,Number(url.searchParams.get('days')||30)));
  const since=new Date(Date.now()-days*86400000).toISOString();
  const [settings,summary,events,jobs]=await Promise.all([
    db.prepare(`SELECT * FROM platform_ai_settings WHERE scope='global' OR (?1 IS NOT NULL AND company_id=?1) ORDER BY scope`).bind(companyId).all(),
    db.prepare(`SELECT company_id,usage_type,SUM(quantity) quantity,COUNT(*) operations FROM platform_usage_events WHERE created_at>=?1 AND (?2 IS NULL OR company_id=?2) GROUP BY company_id,usage_type ORDER BY company_id,usage_type`).bind(since,companyId).all(),
    db.prepare(`SELECT * FROM platform_usage_events WHERE created_at>=?1 AND (?2 IS NULL OR company_id=?2) ORDER BY created_at DESC LIMIT ?3 OFFSET ?4`).bind(since,companyId,size,offset).all(),
    db.prepare(`SELECT * FROM platform_generation_jobs WHERE (?1 IS NULL OR company_id=?1) ORDER BY created_at DESC LIMIT ?2 OFFSET ?3`).bind(companyId,size,offset).all(),
  ]);
  return {settings:settings.results||[],summary:summary.results||[],events:events.results||[],jobs:jobs.results||[],pagination:{page:current,pageSize:size},days};
}

async function readServices(db){
  const [layouts,payments,companyPayments,shipping,companyShipping,roles,permissions,rolePermissions,media,integrity]=await Promise.all([
    db.prepare(`SELECT * FROM platform_layout_templates WHERE deleted_at IS NULL ORDER BY code,version DESC`).all(),
    db.prepare(`SELECT * FROM platform_payment_providers ORDER BY name`).all(),
    db.prepare(`SELECT * FROM platform_company_payment_providers ORDER BY company_id,provider_code`).all(),
    db.prepare(`SELECT * FROM platform_shipping_methods ORDER BY name`).all(),
    db.prepare(`SELECT * FROM platform_company_shipping_methods ORDER BY company_id,method_code`).all(),
    db.prepare(`SELECT * FROM platform_roles WHERE active=1 ORDER BY scope,name`).all(),
    db.prepare(`SELECT * FROM platform_permissions ORDER BY scope,code`).all(),
    db.prepare(`SELECT * FROM platform_role_permissions ORDER BY role_code,permission_code`).all(),
    db.prepare(`SELECT company_id,status,COUNT(*) files,SUM(size_bytes) bytes FROM platform_media_objects GROUP BY company_id,status ORDER BY company_id,status`).all(),
    db.prepare(`SELECT * FROM platform_integrity_incidents WHERE status IN ('open','acknowledged') ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,last_seen_at DESC LIMIT 100`).all(),
  ]);
  return {layouts:layouts.results||[],payments:payments.results||[],companyPayments:companyPayments.results||[],shipping:shipping.results||[],companyShipping:companyShipping.results||[],roles:roles.results||[],permissions:permissions.results||[],rolePermissions:rolePermissions.results||[],media:media.results||[],integrity:integrity.results||[]};
}

export async function onRequestGet(context){
  const auth=await requireRadzAdmin(context);if(!auth.ok)return auth.response;
  if(!await ensureAdvanced(context.env.DB))return missing();
  const url=new URL(context.request.url),section=url.searchParams.get('section')||'summary';
  if(section==='catalog')return json({ok:true,...await readCatalog(context.env.DB,url)});
  if(section==='ai'||section==='usage')return json({ok:true,...await readAi(context.env.DB,url)});
  if(section==='services'||section==='security'||section==='media')return json({ok:true,...await readServices(context.env.DB)});
  const [companies,categories,attributes,usage,jobs,media,incidents]=await Promise.all([
    context.env.DB.prepare(`SELECT COUNT(*) n FROM platform_companies`).first(),
    context.env.DB.prepare(`SELECT COUNT(*) n FROM platform_categories WHERE deleted_at IS NULL`).first(),
    context.env.DB.prepare(`SELECT COUNT(*) n FROM platform_attributes WHERE deleted_at IS NULL`).first(),
    context.env.DB.prepare(`SELECT COUNT(*) n FROM platform_usage_events WHERE created_at>=datetime('now','-30 days')`).first(),
    context.env.DB.prepare(`SELECT COUNT(*) n FROM platform_generation_jobs WHERE status IN ('pending','processing')`).first(),
    context.env.DB.prepare(`SELECT COALESCE(SUM(size_bytes),0) bytes,COUNT(*) files FROM platform_media_objects WHERE status='active'`).first(),
    context.env.DB.prepare(`SELECT COUNT(*) n FROM platform_integrity_incidents WHERE status IN ('open','acknowledged')`).first(),
  ]);
  return json({ok:true,summary:{companies:companies?.n||0,categories:categories?.n||0,attributes:attributes?.n||0,usage30d:usage?.n||0,activeJobs:jobs?.n||0,mediaBytes:media?.bytes||0,mediaFiles:media?.files||0,incidents:incidents?.n||0}});
}

export async function onRequestPost(context){
  const auth=await requireRadzAdmin(context,['platform_owner']);if(!auth.ok)return auth.response;
  if(!await ensureAdvanced(context.env.DB))return missing();
  const body=await bodyOf(context.request);if(!body)return json({ok:false,message:'Dados inválidos.'},400);
  const action=clean(body.action,80),now=nowIso();

  if(action==='category.create'){
    const id=crypto.randomUUID(),name=clean(body.name,120),companyId=clean(body.companyId,120)||null,categorySlug=slug(body.slug||name);
    if(!name||!categorySlug)return json({ok:false,message:'Categoria inválida.'},422);
    await context.env.DB.prepare(`INSERT INTO platform_categories(id,company_id,name,slug,parent_id,sort_order,active,rules_json,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)`).bind(id,companyId,name,categorySlug,clean(body.parentId,120)||null,Number(body.sortOrder||0),body.active===false?0:1,JSON.stringify(obj(body.rules)),now).run();
    await auditRadz(context,auth,'platform.category.created','category',id,{companyId,name});return json({ok:true,id},201);
  }
  if(action==='attribute.create'){
    const id=crypto.randomUUID(),name=clean(body.name,120),code=slug(body.code||name).replace(/-/g,'_'),type=ATTRIBUTE_TYPES.has(body.type)?body.type:'text',companyId=clean(body.companyId,120)||null;
    if(!name||!code)return json({ok:false,message:'Atributo inválido.'},422);
    await context.env.DB.prepare(`INSERT INTO platform_attributes(id,company_id,name,code,type,unit,settings_json,active,sort_order,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10)`).bind(id,companyId,name,code,type,clean(body.unit,40)||null,JSON.stringify(obj(body.settings)),body.active===false?0:1,Number(body.sortOrder||0),now).run();
    await auditRadz(context,auth,'platform.attribute.created','attribute',id,{companyId,name,type});return json({ok:true,id},201);
  }
  if(action==='attribute_value.create'){
    const id=crypto.randomUUID(),attributeId=clean(body.attributeId,120),value=clean(body.value,160),label=clean(body.label||body.value,160);
    if(!attributeId||!value)return json({ok:false,message:'Valor inválido.'},422);
    await context.env.DB.prepare(`INSERT INTO platform_attribute_values(id,attribute_id,value,label,sort_order,metadata_json,active,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8)`).bind(id,attributeId,value,label,Number(body.sortOrder||0),JSON.stringify(obj(body.metadata)),body.active===false?0:1,now).run();
    await auditRadz(context,auth,'platform.attribute_value.created','attribute_value',id,{attributeId,value});return json({ok:true,id},201);
  }
  if(action==='category_attribute.link'){
    const categoryId=clean(body.categoryId,120),attributeId=clean(body.attributeId,120);if(!categoryId||!attributeId)return json({ok:false,message:'Vínculo inválido.'},422);
    await context.env.DB.prepare(`INSERT INTO platform_category_attributes(category_id,attribute_id,required,sort_order,settings_json,updated_at) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(category_id,attribute_id) DO UPDATE SET required=excluded.required,sort_order=excluded.sort_order,settings_json=excluded.settings_json,updated_at=excluded.updated_at`).bind(categoryId,attributeId,bool(body.required)?1:0,Number(body.sortOrder||0),JSON.stringify(obj(body.settings)),now).run();
    await auditRadz(context,auth,'platform.category_attribute.linked','category',categoryId,{attributeId});return json({ok:true});
  }
  if(action==='ai.settings.save'){
    const scope=body.companyId?'company':'global',companyId=scope==='company'?clean(body.companyId,120):null;
    await context.env.DB.prepare(`INSERT INTO platform_ai_settings(scope,company_id,provider,model,enabled,prompt,instructions,language,tone,forbidden_words_json,title_pattern,sku_prefix,timeout_ms,temperature,fallback_json,settings_json,updated_by_user_id,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18) ON CONFLICT(scope,company_id) DO UPDATE SET provider=excluded.provider,model=excluded.model,enabled=excluded.enabled,prompt=excluded.prompt,instructions=excluded.instructions,language=excluded.language,tone=excluded.tone,forbidden_words_json=excluded.forbidden_words_json,title_pattern=excluded.title_pattern,sku_prefix=excluded.sku_prefix,timeout_ms=excluded.timeout_ms,temperature=excluded.temperature,fallback_json=excluded.fallback_json,settings_json=excluded.settings_json,updated_by_user_id=excluded.updated_by_user_id,updated_at=excluded.updated_at`).bind(scope,companyId,clean(body.provider,80)||null,clean(body.model,120)||null,bool(body.enabled)?1:0,clean(body.prompt,12000),clean(body.instructions,12000),clean(body.language,30)||null,clean(body.tone,120)||null,JSON.stringify(Array.isArray(body.forbiddenWords)?body.forbiddenWords:[]),clean(body.titlePattern,300)||null,clean(body.skuPrefix,60)||null,body.timeoutMs==null?null:Math.max(1000,Number(body.timeoutMs)),body.temperature==null?null:Number(body.temperature),JSON.stringify(obj(body.fallback)),JSON.stringify(obj(body.settings)),auth.session.user_id||null,now).run();
    await auditRadz(context,auth,'platform.ai_settings.updated','company',companyId,{scope,provider:clean(body.provider,80),model:clean(body.model,120),enabled:bool(body.enabled)});return json({ok:true});
  }
  if(action==='usage.record'){
    const companyId=clean(body.companyId,120),usageType=clean(body.usageType,80),operationId=clean(body.operationId,160);if(!companyId||!USAGE_TYPES.has(usageType)||!operationId)return json({ok:false,message:'Evento de consumo inválido.'},422);
    try{await context.env.DB.prepare(`INSERT INTO platform_usage_events(id,company_id,usage_type,quantity,operation_id,entity_type,entity_id,metadata_json,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`).bind(crypto.randomUUID(),companyId,usageType,Math.max(0,Number(body.quantity||1)),operationId,clean(body.entityType,80)||null,clean(body.entityId,160)||null,JSON.stringify(obj(body.metadata)),now).run()}catch{return json({ok:true,duplicate:true})}
    return json({ok:true,duplicate:false},201);
  }
  if(action==='layout.create'){
    const id=crypto.randomUUID(),code=slug(body.code||body.name),name=clean(body.name,120);if(!code||!name)return json({ok:false,message:'Layout inválido.'},422);
    const version=Math.max(1,Number(body.version||1));await context.env.DB.prepare(`INSERT INTO platform_layout_templates(id,code,name,description,version,active,is_default,preview_url,config_json,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10)`).bind(id,code,name,clean(body.description,1000),version,body.active===false?0:1,bool(body.isDefault)?1:0,clean(body.previewUrl,500)||null,JSON.stringify(obj(body.config)),now).run();
    await auditRadz(context,auth,'platform.layout.created','layout',id,{code,version});return json({ok:true,id},201);
  }
  if(action==='provider.company.save'){
    const companyId=clean(body.companyId,120),providerCode=clean(body.providerCode,80);if(!companyId||!providerCode)return json({ok:false,message:'Provedor inválido.'},422);
    await context.env.DB.prepare(`INSERT INTO platform_company_payment_providers(company_id,provider_code,enabled,environment,public_config_json,secret_binding_refs_json,status,last_error,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,NULL,?8) ON CONFLICT(company_id,provider_code) DO UPDATE SET enabled=excluded.enabled,environment=excluded.environment,public_config_json=excluded.public_config_json,secret_binding_refs_json=excluded.secret_binding_refs_json,status=excluded.status,last_error=NULL,updated_at=excluded.updated_at`).bind(companyId,providerCode,bool(body.enabled)?1:0,['production','sandbox'].includes(body.environment)?body.environment:'production',JSON.stringify(obj(body.publicConfig)),JSON.stringify(obj(body.secretBindingRefs)),clean(body.status,80)||'configured',now).run();
    await auditRadz(context,auth,'platform.payment_provider.updated','company',companyId,{providerCode,enabled:bool(body.enabled)});return json({ok:true});
  }
  if(action==='shipping.company.save'){
    const companyId=clean(body.companyId,120),methodCode=clean(body.methodCode,80);if(!companyId||!methodCode)return json({ok:false,message:'Frete inválido.'},422);
    await context.env.DB.prepare(`INSERT INTO platform_company_shipping_methods(company_id,method_code,enabled,config_json,status,last_error,updated_at) VALUES(?1,?2,?3,?4,?5,NULL,?6) ON CONFLICT(company_id,method_code) DO UPDATE SET enabled=excluded.enabled,config_json=excluded.config_json,status=excluded.status,last_error=NULL,updated_at=excluded.updated_at`).bind(companyId,methodCode,bool(body.enabled)?1:0,JSON.stringify(obj(body.config)),clean(body.status,80)||'configured',now).run();
    await auditRadz(context,auth,'platform.shipping_method.updated','company',companyId,{methodCode,enabled:bool(body.enabled)});return json({ok:true});
  }
  if(action==='integrity.resolve'){
    const id=clean(body.id,120);await context.env.DB.prepare(`UPDATE platform_integrity_incidents SET status='resolved',resolved_at=?1,last_seen_at=?1 WHERE id=?2`).bind(now,id).run();await auditRadz(context,auth,'platform.integrity.resolved','integrity_incident',id);return json({ok:true});
  }
  return json({ok:false,message:'Ação avançada não reconhecida.'},400);
}

export async function onRequestPatch(context){
  const auth=await requireRadzAdmin(context,['platform_owner']);if(!auth.ok)return auth.response;
  if(!await ensureAdvanced(context.env.DB))return missing();
  const body=await bodyOf(context.request);if(!body)return json({ok:false,message:'Dados inválidos.'},400);
  const action=clean(body.action,80),now=nowIso();
  if(['category.update','attribute.update'].includes(action)){
    const isCategory=action.startsWith('category'),table=isCategory?'platform_categories':'platform_attributes',id=clean(body.id,120),current=await context.env.DB.prepare(`SELECT * FROM ${table} WHERE id=?1 AND deleted_at IS NULL`).bind(id).first();
    if(!current)return json({ok:false,message:'Registro não encontrado.'},404);
    if(isCategory){await context.env.DB.prepare(`UPDATE platform_categories SET name=?1,slug=?2,parent_id=?3,sort_order=?4,active=?5,rules_json=?6,updated_at=?7 WHERE id=?8`).bind(clean(body.name??current.name,120),slug(body.slug??current.slug),clean(body.parentId??current.parent_id,120)||null,Number(body.sortOrder??current.sort_order),body.active==null?current.active:(bool(body.active)?1:0),JSON.stringify(obj(body.rules,obj(current.rules_json))),now,id).run()}
    else{const type=ATTRIBUTE_TYPES.has(body.type)?body.type:current.type;await context.env.DB.prepare(`UPDATE platform_attributes SET name=?1,code=?2,type=?3,unit=?4,settings_json=?5,active=?6,sort_order=?7,updated_at=?8 WHERE id=?9`).bind(clean(body.name??current.name,120),slug(body.code??current.code).replace(/-/g,'_'),type,clean(body.unit??current.unit,40)||null,JSON.stringify(obj(body.settings,obj(current.settings_json))),body.active==null?current.active:(bool(body.active)?1:0),Number(body.sortOrder??current.sort_order),now,id).run()}
    await auditRadz(context,auth,`platform.${isCategory?'category':'attribute'}.updated`,isCategory?'category':'attribute',id);return json({ok:true});
  }
  if(action==='soft_delete'){
    const allowed=new Set(['platform_categories','platform_attributes','platform_attribute_values','platform_layout_templates']);const table=clean(body.table,80);if(!allowed.has(table))return json({ok:false,message:'Tabela não permitida.'},422);const id=clean(body.id,120);await context.env.DB.prepare(`UPDATE ${table} SET deleted_at=?1,updated_at=?1 WHERE id=?2`).bind(now,id).run();await auditRadz(context,auth,'platform.soft_deleted',table,id);return json({ok:true});
  }
  if(action==='restore'){
    const allowed=new Set(['platform_categories','platform_attributes','platform_attribute_values','platform_layout_templates']);const table=clean(body.table,80);if(!allowed.has(table))return json({ok:false,message:'Tabela não permitida.'},422);const id=clean(body.id,120);await context.env.DB.prepare(`UPDATE ${table} SET deleted_at=NULL,updated_at=?1 WHERE id=?2`).bind(now,id).run();await auditRadz(context,auth,'platform.restored',table,id);return json({ok:true});
  }
  return json({ok:false,message:'Alteração não reconhecida.'},400);
}
