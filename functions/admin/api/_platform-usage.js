async function hasTable(db,name){
  try{
    const row=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1 LIMIT 1").bind(name).first();
    return Boolean(row);
  }catch{return false}
}

export async function recordPlatformUsage(db,{companyId,usageType,quantity=1,operationId,entityType=null,entityId=null,metadata={}}){
  if(!db||!companyId||!usageType||!operationId)return {tracked:false,reason:'invalid'};
  if(!await hasTable(db,'platform_usage_events'))return {tracked:false,reason:'migration_pending'};
  try{
    await db.prepare(`INSERT INTO platform_usage_events
      (id,company_id,usage_type,quantity,operation_id,entity_type,entity_id,metadata_json,created_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`)
      .bind(crypto.randomUUID(),companyId,usageType,Math.max(0,Math.round(Number(quantity||0))),String(operationId),entityType,entityId,JSON.stringify(metadata||{}),new Date().toISOString())
      .run();
    return {tracked:true,duplicate:false};
  }catch(error){
    const msg=String(error?.message||error||'');
    if(/unique|constraint/i.test(msg))return {tracked:true,duplicate:true};
    console.warn('platform_usage_events:',error);
    return {tracked:false,reason:'write_failed'};
  }
}

export async function trackedStorageBytes(db,companyId){
  if(!db||!companyId||!await hasTable(db,'platform_media_objects'))return null;
  try{
    const row=await db.prepare(`SELECT COALESCE(SUM(size_bytes),0) bytes
      FROM platform_media_objects
      WHERE company_id=?1 AND status IN ('pending','active') AND deleted_at IS NULL`)
      .bind(companyId).first();
    return Number(row?.bytes||0);
  }catch{return null}
}

export async function registerPlatformMedia(db,{companyId,storeId,key,originalName,mimeType,sizeBytes,checksum=null,userId=null,metadata={}}){
  if(!db||!companyId||!key)return {tracked:false,reason:'invalid'};
  if(!await hasTable(db,'platform_media_objects'))return {tracked:false,reason:'migration_pending'};
  const now=new Date().toISOString();
  try{
    const existing=await db.prepare(`SELECT id FROM platform_media_objects WHERE object_key=?1 LIMIT 1`).bind(key).first();
    if(existing){
      await db.prepare(`UPDATE platform_media_objects SET status='active',size_bytes=?1,mime_type=?2,original_filename=?3,checksum=?4,metadata_json=?5,deleted_at=NULL,purge_after=NULL,updated_at=?6 WHERE id=?7 AND company_id=?8`)
        .bind(Number(sizeBytes||0),mimeType||null,originalName||null,checksum||null,JSON.stringify(metadata||{}),now,existing.id,companyId).run();
      return {tracked:true,id:existing.id,reused:true};
    }
    const id=crypto.randomUUID();
    await db.prepare(`INSERT INTO platform_media_objects
      (id,company_id,store_id,object_key,original_filename,mime_type,size_bytes,checksum,visibility,status,metadata_json,created_by_user_id,created_at,updated_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'public','active',?9,?10,?11,?11)`)
      .bind(id,companyId,storeId||null,key,originalName||null,mimeType||null,Number(sizeBytes||0),checksum||null,JSON.stringify(metadata||{}),userId||null,now).run();
    return {tracked:true,id,reused:false};
  }catch(error){
    console.warn('platform_media_objects:',error);
    return {tracked:false,reason:'write_failed'};
  }
}

export async function markPlatformMediaTrash(db,{companyId,key,retentionDays=30}){
  if(!db||!companyId||!key||!await hasTable(db,'platform_media_objects'))return {tracked:false};
  const now=new Date(),purge=new Date(now.getTime()+Math.max(1,Number(retentionDays||30))*86400000);
  try{
    await db.prepare(`UPDATE platform_media_objects SET status='trash',deleted_at=?1,purge_after=?2,updated_at=?1 WHERE company_id=?3 AND object_key=?4`)
      .bind(now.toISOString(),purge.toISOString(),companyId,key).run();
    return {tracked:true};
  }catch{return {tracked:false}}
}

export async function activeMediaReferences(db,{companyId,key}){
  if(!db||!companyId||!key||!await hasTable(db,'platform_media_references')||!await hasTable(db,'platform_media_objects'))return null;
  try{
    const row=await db.prepare(`SELECT COUNT(*) total
      FROM platform_media_references r
      JOIN platform_media_objects m ON m.id=r.media_id
      WHERE r.company_id=?1 AND m.company_id=?1 AND m.object_key=?2 AND r.deleted_at IS NULL`)
      .bind(companyId,key).first();
    return Number(row?.total||0);
  }catch{return null}
}
