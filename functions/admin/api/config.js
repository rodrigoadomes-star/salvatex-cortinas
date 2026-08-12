import { json, requireAdmin, logAdmin } from "./_auth.js";

function mergeDeep(target, source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return target;
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = mergeDeep(
        target[key] && typeof target[key] === "object" && !Array.isArray(target[key]) ? target[key] : {},
        value
      );
    } else {
      target[key] = value;
    }
  }
  return target;
}

async function readConfig(db) {
  const row = await db.prepare(`SELECT value_json,updated_at FROM store_configs WHERE store_id='salvatex' AND config_key='site_config'`).first();
  let config = {};
  try { config = JSON.parse(row?.value_json || '{}'); } catch {}
  return { config, updatedAt: row?.updated_at || null };
}

export async function onRequestGet(context) {
  const a=requireAdmin(context); if(!a.ok) return a.response;
  const data=await readConfig(context.env.DB);
  return json({ok:true,...data});
}

export async function onRequestPut(context) {
  const a=requireAdmin(context); if(!a.ok) return a.response;
  let body={}; try{body=await context.request.json()}catch{return json({ok:false,message:"JSON inválido"},400)}
  const patch=body.config&&typeof body.config==='object'?body.config:null;
  if(!patch) return json({ok:false,message:"Configuração inválida"},400);
  const current=(await readConfig(context.env.DB)).config;
  const merged=mergeDeep(current,patch);
  const now=new Date().toISOString();
  await context.env.DB.prepare(`INSERT INTO store_configs(store_id,config_key,value_json,updated_at) VALUES('salvatex','site_config',?1,?2) ON CONFLICT(store_id,config_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).bind(JSON.stringify(merged),now).run();
  await logAdmin(context.env.DB,"site_config_updated","store_config","site_config");
  return json({ok:true,config:merged,updatedAt:now});
}
