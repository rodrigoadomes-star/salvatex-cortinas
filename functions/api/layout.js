import { json } from "./_lib.js";

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
    const row=await context.env.DB.prepare(`
      SELECT value_json,updated_at
      FROM store_configs
      WHERE store_id='salvatex'
        AND config_key='layout_config'
    `).first();

    let layout=null;

    if(row?.value_json){
      try{
        layout=JSON.parse(row.value_json);
      }catch{
        layout=null;
      }
    }

    return json({
      ok:true,
      layout,
      updatedAt:row?.updated_at||null
    },200,{
      "Cache-Control":"no-store, no-cache, must-revalidate"
    });
  }catch(error){
    console.error("layout public",error);

    return json({
      ok:false,
      layout:null
    },500,{
      "Cache-Control":"no-store"
    });
  }
}
