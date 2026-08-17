import { json } from "../_lib.js";

function parseJSON(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}

function q(name){return `"${String(name).replaceAll('"','""')}"`;}

export async function onRequestGet(context) {
  if (!context.env.DB) return json({ok:false,message:"Banco indisponível"},503);

  try {
    const info=await context.env.DB.prepare("PRAGMA table_info(pages)").all();
    const columns=new Set((info.results||[]).map(row=>String(row.name||"")));
    if(!columns.has("id")||!columns.has("title")||!columns.has("slug")){
      return json({ok:false,message:"Estrutura de páginas incompleta"},500);
    }

    const optional=(name,fallbackSql)=>columns.has(name)?q(name):`${fallbackSql} AS ${q(name)}`;
    const selected=[
      q("id"),q("title"),q("slug"),
      optional("page_type","'conteudo'"),
      optional("hero_image_url","''"),
      optional("measures_json","'[]'"),
      optional("custom_measure_url","''"),
      optional("nav_group","'oculto'"),
      optional("nav_order","100"),
      optional("active","1"),
      optional("updated_at","NULL")
    ];

    const where=[];
    const binds=[];
    if(columns.has("store_id")){where.push(`${q("store_id")}=?${binds.length+1}`);binds.push("salvatex");}
    if(columns.has("active"))where.push(`${q("active")}=1`);
    const order=columns.has("nav_order")?`${q("nav_order")} ASC, ${q("title")} ASC`:`${q("title")} ASC`;
    const sql=`SELECT ${selected.join(",")} FROM pages${where.length?` WHERE ${where.join(" AND ")}`:""} ORDER BY ${order}`;
    let stmt=context.env.DB.prepare(sql);
    if(binds.length)stmt=stmt.bind(...binds);
    const result=await stmt.all();

    const pages=(result.results||[]).map(row=>{
      const measures=parseJSON(row.measures_json,[])
        .map(measure=>({id:String(measure?.id||""),label:String(measure?.label||""),value:String(measure?.value||"")}))
        .filter(measure=>measure.label);
      return {
        id:row.id,
        title:row.title,
        slug:row.slug,
        pageType:row.page_type||"conteudo",
        heroImageUrl:row.hero_image_url||"",
        navGroup:row.nav_group||"oculto",
        navOrder:Number(row.nav_order??100),
        measures,
        customMeasureUrl:row.custom_measure_url||""
      };
    });

    return json({ok:true,pages,schemaCompatibility:{optionalColumnsMissing:["page_type","hero_image_url","measures_json","custom_measure_url","nav_group","nav_order"].filter(name=>!columns.has(name))}},200,{"Cache-Control":"no-store"});
  } catch (error) {
    console.error("public pages list error",error);
    return json({ok:false,message:"Não foi possível carregar as páginas"},500);
  }
}
