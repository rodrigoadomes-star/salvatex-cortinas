import { json } from "../_lib.js";

export async function onRequestGet(context){
  if(!context.env.DB) return json({ok:false,message:"Banco indisponível"},503);
  try{
    const result=await context.env.DB.prepare(`
      SELECT id,title,slug,page_type,active,updated_at
      FROM pages
      WHERE store_id='salvatex' AND active=1
      ORDER BY updated_at DESC, title ASC
    `).all();
    const pages=(result.results||[]).map(row=>({
      id:row.id,
      title:row.title,
      slug:row.slug,
      pageType:row.page_type||'conteudo'
    }));
    return json({ok:true,pages});
  }catch(error){
    console.error('public pages list error',error);
    return json({ok:false,message:"Não foi possível carregar as páginas"},500);
  }
}
