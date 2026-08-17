import { auditRadz, json, requireRadzAdmin } from './_auth.js';
import { clean, nowIso } from './_policy.js';

function bool(v){return v===true||v===1||v==='1'||v==='true'}
function obj(v,fallback={}){try{const x=typeof v==='string'?JSON.parse(v):v;return x&&typeof x==='object'?x:fallback}catch{return fallback}}
async function ready(db){try{return Boolean(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_ai_settings'").first())}catch{return false}}
function values(body,auth,now){return [
  clean(body.provider,80)||null,
  clean(body.model,120)||null,
  bool(body.enabled)?1:0,
  clean(body.prompt,12000),
  clean(body.instructions,12000),
  clean(body.language,30)||null,
  clean(body.tone,120)||null,
  JSON.stringify(Array.isArray(body.forbiddenWords)?body.forbiddenWords:[]),
  clean(body.titlePattern,300)||null,
  clean(body.skuPrefix,60)||null,
  body.timeoutMs==null?null:Math.max(1000,Math.min(120000,Number(body.timeoutMs)||30000)),
  body.temperature==null||body.temperature===''?null:Number(body.temperature),
  JSON.stringify(obj(body.fallback)),
  JSON.stringify(obj(body.settings)),
  auth.session.user_id||null,
  now
]}

export async function onRequestGet(context){
  const auth=await requireRadzAdmin(context);if(!auth.ok)return auth.response;
  if(!await ready(context.env.DB))return json({ok:false,code:'MIGRATION_REQUIRED',message:'Migration de IA ainda não aplicada.'},409);
  const companyId=clean(new URL(context.request.url).searchParams.get('companyId'),120)||null;
  const rows=await context.env.DB.prepare(`SELECT * FROM platform_ai_settings
    WHERE scope='global' OR (?1 IS NOT NULL AND scope='company' AND company_id=?1)
    ORDER BY CASE scope WHEN 'global' THEN 0 ELSE 1 END`).bind(companyId).all();
  return json({ok:true,settings:rows.results||[]});
}

export async function onRequestPut(context){
  const auth=await requireRadzAdmin(context,['platform_owner']);if(!auth.ok)return auth.response;
  if(!await ready(context.env.DB))return json({ok:false,code:'MIGRATION_REQUIRED',message:'Migration de IA ainda não aplicada.'},409);
  let body;try{body=await context.request.json()}catch{return json({ok:false,message:'Dados inválidos.'},400)}
  const companyId=clean(body.companyId,120)||null,scope=companyId?'company':'global',now=nowIso(),v=values(body,auth,now);

  if(scope==='global'){
    const result=await context.env.DB.prepare(`UPDATE platform_ai_settings SET
      provider=?1,model=?2,enabled=?3,prompt=?4,instructions=?5,language=?6,tone=?7,
      forbidden_words_json=?8,title_pattern=?9,sku_prefix=?10,timeout_ms=?11,temperature=?12,
      fallback_json=?13,settings_json=?14,updated_by_user_id=?15,updated_at=?16
      WHERE scope='global'`).bind(...v).run();
    if(!Number(result?.meta?.changes||0)){
      await context.env.DB.prepare(`INSERT INTO platform_ai_settings
        (scope,company_id,provider,model,enabled,prompt,instructions,language,tone,forbidden_words_json,title_pattern,sku_prefix,timeout_ms,temperature,fallback_json,settings_json,updated_by_user_id,updated_at)
        VALUES('global',NULL,?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)`).bind(...v).run();
    }
  }else{
    const exists=await context.env.DB.prepare(`SELECT scope FROM platform_ai_settings WHERE scope='company' AND company_id=?1 LIMIT 1`).bind(companyId).first();
    if(exists){
      await context.env.DB.prepare(`UPDATE platform_ai_settings SET
        provider=?1,model=?2,enabled=?3,prompt=?4,instructions=?5,language=?6,tone=?7,
        forbidden_words_json=?8,title_pattern=?9,sku_prefix=?10,timeout_ms=?11,temperature=?12,
        fallback_json=?13,settings_json=?14,updated_by_user_id=?15,updated_at=?16
        WHERE scope='company' AND company_id=?17`).bind(...v,companyId).run();
    }else{
      await context.env.DB.prepare(`INSERT INTO platform_ai_settings
        (scope,company_id,provider,model,enabled,prompt,instructions,language,tone,forbidden_words_json,title_pattern,sku_prefix,timeout_ms,temperature,fallback_json,settings_json,updated_by_user_id,updated_at)
        VALUES('company',?17,?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)`).bind(...v,companyId).run();
    }
  }

  await auditRadz(context,auth,'platform.ai_settings.updated',scope==='global'?'platform':'company',companyId,{scope,provider:v[0],model:v[1],enabled:Boolean(v[2])});
  return json({ok:true,scope,companyId});
}
