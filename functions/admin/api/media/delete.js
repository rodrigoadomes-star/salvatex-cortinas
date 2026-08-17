import {
  json,
  requireAdmin,
  logAdmin
} from "../_auth.js";
import { activeMediaReferences, markPlatformMediaTrash } from "../_platform-usage.js";

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  if (!context.env.MEDIA) return json({ok:false,message:"Binding R2 MEDIA não configurado."},503);

  const url = new URL(context.request.url);
  const key = String(url.searchParams.get("key") || "").trim();
  const allowedPrefix = `companies/${auth.companyId}/stores/${auth.storeId}/public/configuradores/`;

  if (!key || !key.startsWith(allowedPrefix)) {
    return json({ok:false,message:"Arquivo não informado ou fora do escopo desta empresa."},400);
  }

  // A object_key enviada pelo navegador nunca decide sozinha o que pode ser
  // apagado: o prefixo já foi validado contra a empresa/loja da sessão.
  let metadataRow=null;
  try{
    metadataRow=await context.env.DB.prepare(`SELECT id,status FROM platform_media_objects
      WHERE company_id=?1 AND store_id=?2 AND object_key=?3 LIMIT 1`)
      .bind(auth.companyId,auth.storeId,key).first();
  }catch(_){}

  if(metadataRow){
    const refs=await activeMediaReferences(context.env.DB,{companyId:auth.companyId,key});
    if(Number(refs||0)>0){
      await logAdmin(context.env.DB,"media_reference_removed_but_object_retained","media",key,{references:Number(refs)},auth.storeId);
      return json({ok:true,key,retained:true,reason:"active_references",references:Number(refs)});
    }

    await markPlatformMediaTrash(context.env.DB,{companyId:auth.companyId,key,retentionDays:30});
    await logAdmin(context.env.DB,"media_moved_to_trash","media",key,{retentionDays:30},auth.storeId);
    return json({ok:true,key,trashed:true,purgeAfterDays:30});
  }

  // Compatibilidade temporária: objetos antigos ainda sem metadados continuam
  // com a exclusão física legada. Depois do backfill R2→D1, este caminho deixa
  // de ser usado sem precisar quebrar as lojas existentes.
  await context.env.MEDIA.delete(key);
  await logAdmin(context.env.DB,"media_deleted_legacy","media",key,{metadataTracked:false},auth.storeId);
  return json({ok:true,key,deleted:true,legacy:true});
}
