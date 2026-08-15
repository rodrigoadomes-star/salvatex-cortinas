import { json, requireAdmin, logAdmin } from "./_auth.js";

function mergeDeep(target,source){
  if(
    !source ||
    typeof source!=="object" ||
    Array.isArray(source)
  ){
    return target;
  }

  for(const [key,value] of Object.entries(source)){
    if(
      value &&
      typeof value==="object" &&
      !Array.isArray(value)
    ){
      target[key]=mergeDeep(
        target[key] &&
        typeof target[key]==="object" &&
        !Array.isArray(target[key])
          ? target[key]
          : {},
        value
      );
    }else{
      target[key]=value;
    }
  }

  return target;
}

function parseJson(value,fallback={}){
  try{
    return JSON.parse(value||"{}");
  }catch{
    return fallback;
  }
}

async function readLayout(db){
  const dedicated=
    await db.prepare(`
      SELECT value_json,updated_at
      FROM store_configs
      WHERE store_id='salvatex'
        AND config_key='layout_config'
    `).first();

  const dedicatedLayout=
    parseJson(
      dedicated?.value_json,
      null
    );

  /*
    Fallback para site_config.layout.
    Isso mantém compatibilidade com a primeira versão do editor.
  */
  const siteRow=
    await db.prepare(`
      SELECT value_json,updated_at
      FROM store_configs
      WHERE store_id='salvatex'
        AND config_key='site_config'
    `).first();

  const siteConfig=
    parseJson(
      siteRow?.value_json,
      {}
    );

  const fallbackLayout=
    siteConfig?.layout &&
    typeof siteConfig.layout==="object"
      ? siteConfig.layout
      : null;

  const layout=
    dedicatedLayout &&
    typeof dedicatedLayout==="object" &&
    Object.keys(dedicatedLayout).length
      ? dedicatedLayout
      : fallbackLayout || {};

  return {
    layout,
    updatedAt:
      dedicated?.updated_at ||
      siteRow?.updated_at ||
      null,
    source:
      dedicatedLayout &&
      Object.keys(dedicatedLayout||{}).length
        ? "layout_config"
        : fallbackLayout
          ? "site_config.layout"
          : "default"
  };
}

export async function onRequestGet(context){
  const auth=await requireAdmin(context);
  if(!auth.ok)return auth.response;

  if(!context.env.DB){
    return json({
      ok:false,
      layout:null,
      message:"Banco D1 indisponível."
    },503);
  }

  try{
    const data=
      await readLayout(
        context.env.DB
      );

    return json({
      ok:true,
      ...data
    },200,{
      "Cache-Control":
        "no-store, no-cache, must-revalidate"
    });
  }catch(error){
    console.error(
      "admin layout get",
      error
    );

    return json({
      ok:false,
      layout:null,
      message:
        "Não foi possível carregar o layout."
    },500);
  }
}

export async function onRequestPut(context){
  const auth=await requireAdmin(context);
  if(!auth.ok)return auth.response;

  if(!context.env.DB){
    return json({
      ok:false,
      message:"Banco D1 indisponível."
    },503);
  }

  let body={};

  try{
    body=
      await context.request.json();
  }catch{
    return json({
      ok:false,
      message:"JSON inválido."
    },400);
  }

  const layout=
    body.layout &&
    typeof body.layout==="object" &&
    !Array.isArray(body.layout)
      ? body.layout
      : null;

  if(!layout){
    return json({
      ok:false,
      message:"Layout inválido."
    },400);
  }

  const now=
    new Date().toISOString();

  try{
    /*
      1. Fonte dedicada do editor.
    */
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

    /*
      2. Cópia de segurança dentro do site_config,
         que já é uma configuração comprovadamente usada pelo site.
    */
    const siteRow=
      await context.env.DB.prepare(`
        SELECT value_json
        FROM store_configs
        WHERE store_id='salvatex'
          AND config_key='site_config'
      `).first();

    const siteConfig=
      parseJson(
        siteRow?.value_json,
        {}
      );

    siteConfig.layout=
      layout;

    await context.env.DB.prepare(`
      INSERT INTO store_configs(
        store_id,
        config_key,
        value_json,
        updated_at
      )
      VALUES(
        'salvatex',
        'site_config',
        ?1,
        ?2
      )
      ON CONFLICT(store_id,config_key)
      DO UPDATE SET
        value_json=excluded.value_json,
        updated_at=excluded.updated_at
    `)
      .bind(
        JSON.stringify(siteConfig),
        now
      )
      .run();

    /*
      3. Confirma imediatamente lendo novamente o banco.
    */
    const saved=
      await readLayout(
        context.env.DB
      );

    const savedJson=
      JSON.stringify(
        saved.layout
      );

    const sentJson=
      JSON.stringify(
        layout
      );

    if(savedJson!==sentJson){
      throw new Error(
        "A leitura de confirmação não corresponde ao layout enviado."
      );
    }

    await logAdmin(
      context.env.DB,
      "layout_updated",
      "store_config",
      "layout_config",
      {
        source:"layout_editor",
        confirmed:true
      }
    );

    return json({
      ok:true,
      layout:saved.layout,
      updatedAt:saved.updatedAt||now,
      source:saved.source,
      confirmed:true
    },200,{
      "Cache-Control":
        "no-store, no-cache, must-revalidate"
    });

  }catch(error){
    console.error(
      "admin layout put",
      error
    );

    return json({
      ok:false,
      message:
        "Não foi possível salvar o layout no D1: " +
        String(
          error?.message ||
          error
        )
    },500);
  }
}
