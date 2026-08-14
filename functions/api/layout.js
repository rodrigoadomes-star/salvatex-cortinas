import { json } from "./_lib.js";

function parseJson(value,fallback={}){
  try{
    return JSON.parse(value||"{}");
  }catch{
    return fallback;
  }
}

export async function onRequestGet(context){
  if(!context.env.DB){
    return json({
      ok:false,
      layout:null
    },503,{
      "Cache-Control":"no-store"
    });
  }

  try{
    const dedicated=
      await context.env.DB.prepare(`
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

    const siteRow=
      await context.env.DB.prepare(`
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
        : fallbackLayout;

    return json({
      ok:true,
      layout:layout||null,
      source:
        dedicatedLayout &&
        Object.keys(dedicatedLayout||{}).length
          ? "layout_config"
          : fallbackLayout
            ? "site_config.layout"
            : "default",
      updatedAt:
        dedicated?.updated_at ||
        siteRow?.updated_at ||
        null
    },200,{
      "Cache-Control":
        "no-store, no-cache, must-revalidate"
    });

  }catch(error){
    console.error(
      "layout public",
      error
    );

    return json({
      ok:false,
      layout:null
    },500,{
      "Cache-Control":"no-store"
    });
  }
}
