import {
  json,
  clean,
  logAdmin
} from "../_auth.js";
import { requireAdminPermission } from "../_permissions.js";
import { getEffectiveLimits } from "../../../platform/api/_entitlements.js";
import { recordPlatformUsage, registerPlatformMedia, trackedStorageBytes } from "../_platform-usage.js";
import { extensionMatchesMime, validateMediaSignature } from "./_file-validation.js";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

function extensionFromType(type) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov"
  };
  return map[type] || "bin";
}

function slug(value, fallback = "geral") {
  const result = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return result || fallback;
}

async function sha256Hex(buffer){
  const digest=await crypto.subtle.digest('SHA-256',buffer);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function onRequestGet(context) {
  const auth = await requireAdminPermission(context,"company.products.write");
  if (!auth.ok) return auth.response;
  const bytes=await trackedStorageBytes(context.env.DB,auth.companyId);
  let limit=null;
  try{const limits=await getEffectiveLimits(context.env.DB,auth.companyId);limit=limits.storage_bytes==null?null:Number(limits.storage_bytes)}catch(_){}
  return json({
    ok: true,
    configured: Boolean(context.env.MEDIA),
    binding: "MEDIA",
    trackedBytes: bytes,
    storageLimitBytes: limit,
    trackingReady: bytes !== null,
    acceptedImageTypes:[...IMAGE_TYPES],
    acceptedVideoTypes:[...VIDEO_TYPES],
    message: context.env.MEDIA ? "R2 conectado." : "Crie um bucket R2 e vincule-o ao projeto com o binding MEDIA."
  });
}

export async function onRequestPost(context) {
  const auth = await requireAdminPermission(context,"company.products.write");
  if (!auth.ok) return auth.response;
  if (!context.env.MEDIA) return json({ok:false,code:"R2_NOT_CONFIGURED",message:"R2 ainda não configurado. Vincule o bucket usando o binding MEDIA."},503);

  let form;
  try { form = await context.request.formData(); }
  catch { return json({ok:false,message:"Upload inválido."},400); }

  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return json({ok:false,message:"Selecione um arquivo."},400);

  const type = String(file.type || "").toLowerCase();
  const isImage = IMAGE_TYPES.has(type);
  const isVideo = VIDEO_TYPES.has(type);
  if (!isImage && !isVideo) return json({ok:false,message:"Formato não suportado. Use JPG, JPEG, PNG, WebP, GIF, AVIF, MP4, WebM ou MOV."},400);
  if (!extensionMatchesMime(file.name,type)) return json({ok:false,code:"FILE_EXTENSION_MISMATCH",message:"A extensão do arquivo não corresponde ao tipo informado."},400);

  const max = isVideo ? 150 * 1024 * 1024 : 20 * 1024 * 1024;
  const fileSize=Number(file.size||0);
  if (!Number.isFinite(fileSize) || fileSize <= 0) return json({ok:false,message:"Arquivo vazio ou inválido."},400);
  if (fileSize > max) return json({ok:false,message:isVideo?"Vídeo acima de 150 MB.":"Imagem acima de 20 MB."},400);

  const tracked=await trackedStorageBytes(context.env.DB,auth.companyId);
  let storageLimit=null;
  try{const limits=await getEffectiveLimits(context.env.DB,auth.companyId);storageLimit=limits.storage_bytes==null?null:Number(limits.storage_bytes)}catch(_){}
  if(tracked!==null&&storageLimit!==null&&tracked+fileSize>storageLimit){
    return json({ok:false,code:'STORAGE_LIMIT_REACHED',message:'Limite de armazenamento do plano atingido.',usedBytes:tracked,uploadBytes:fileSize,limitBytes:storageLimit},409);
  }

  const buffer=await file.arrayBuffer();
  const signature=validateMediaSignature(buffer,type);
  if(!signature.ok){
    await logAdmin(context.env.DB,"media_upload_rejected","media",clean(file.name,240),{reason:signature.reason,mimeType:type,size:fileSize},auth.storeId).catch(()=>{});
    return json({ok:false,code:"FILE_SIGNATURE_MISMATCH",message:"O conteúdo do arquivo não corresponde ao formato declarado."},400);
  }

  const configurator = slug(form.get("configurator") || form.get("folder") || "geral");
  const tecido = slug(form.get("tecido"), "geral");
  const cor = slug(form.get("cor"), "geral");
  const forro = slug(form.get("forro"), "geral");
  const kind = isVideo ? "videos" : "imagens";
  const extension = extensionFromType(type);
  const key = ["companies",auth.companyId,"stores",auth.storeId,"public","configuradores",configurator,tecido,cor,forro,kind,`${crypto.randomUUID()}.${extension}`].join("/");
  const now = new Date().toISOString();
  const checksum=await sha256Hex(buffer);

  await context.env.MEDIA.put(key,buffer,{
    httpMetadata:{contentType:type,cacheControl:"public, max-age=31536000, immutable"},
    customMetadata:{originalName:clean(file.name,240),uploadedAt:now,checksum}
  });

  const metadata=await registerPlatformMedia(context.env.DB,{
    companyId:auth.companyId,
    storeId:auth.storeId,
    key,
    originalName:clean(file.name,240),
    mimeType:type,
    sizeBytes:fileSize,
    checksum,
    userId:auth.user?.id||null,
    metadata:{configurator,tecido,cor,forro,kind}
  });

  if(!metadata.tracked && metadata.reason!=='migration_pending'){
    try{await context.env.MEDIA.delete(key)}catch(_){}
    await logAdmin(context.env.DB,"media_upload_compensated","media",key,{reason:metadata.reason||'unknown'},auth.storeId);
    return json({ok:false,code:'MEDIA_METADATA_FAILED',message:'O arquivo não pôde ser registrado com segurança. O upload foi revertido.'},500);
  }

  await recordPlatformUsage(context.env.DB,{
    companyId:auth.companyId,
    usageType:'storage_usage',
    quantity:fileSize,
    operationId:`media-upload:${key}`,
    entityType:'media',
    entityId:metadata.id||key,
    metadata:{storeId:auth.storeId,mimeType:type,checksum}
  });

  await logAdmin(context.env.DB,"media_uploaded","media",key,{type,size:fileSize,configurator,tecido,cor,forro,checksum,metadataTracked:metadata.tracked===true},auth.storeId);

  return json({ok:true,key,url:"/media/"+key,type,size:fileSize,originalName:file.name,checksum,metadataTracked:metadata.tracked===true});
}
