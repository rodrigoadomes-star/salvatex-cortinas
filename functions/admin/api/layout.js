import { json, requireAdmin, logAdmin } from "./_auth.js";

async function readLayout(db){
  const row=await db.prepare(`
    SELECT value_json,updated_at
    FROM store_configs
    WHERE store_id='salvatex'
      AND config_key='layout_config'
  `).first();

  let layout={};

  try{
    layout=JSON.parse(row?.value_json||'{}');
  }catch{
    layout={};
  }

  return {
    layout,
    updatedAt:row?.updated_at||null
  };
}

export async function onRequestGet(context){
  const a=requireAdmin(context);
  if(!a.ok)return a.response;

  if(!context.env.DB){
    return json({
      ok:false,
      layout:null,
      message:"Banco D1 indisponível."
    },503);
  }

  const data=await readLayout(context.env.DB);

  return json({
    ok:true,
    ...data
  },{
    "Cache-Control":"no-store"
  });
}

export async function onRequestPut(context){
  const a=requireAdmin(context);
  if(!a.ok)return a.response;

  if(!context.env.DB){
    return json({
      ok:false,
      message:"Banco D1 indisponível."
    },503);
  }

  let body={};

  try{
    body=await context.request.json();
  }catch{
    return json({
      ok:false,
      message:"JSON inválido."
    },400);
  }

  const layout=
    body.layout &&
    typeof body.layout==='object' &&
    !Array.isArray(body.layout)
      ? body.layout
      : null;

  if(!layout){
    return json({
      ok:false,
      message:"Layout inválido."
    },400);
  }

  const now=new Date().toISOString();

  await context.env.DB.prepare(`
    INSERT INTO store_configs(
      store_id,
      config_key,
      value_json,
      updated_at
    )
    VALUES(
      'salvatex',
      'layout_config',
      ?1,
      ?2
    )
    ON CONFLICT(store_id,config_key)
    DO UPDATE SET
      value_json=excluded.value_json,
      updated_at=excluded.updated_at
  `)
    .bind(
      JSON.stringify(layout),
      now
    )
    .run();

  await logAdmin(
    context.env.DB,
    "layout_updated",
    "store_config",
    "layout_config"
  );

  return json({
    ok:true,
    layout,
    updatedAt:now
  },{
    "Cache-Control":"no-store"
  });
}
