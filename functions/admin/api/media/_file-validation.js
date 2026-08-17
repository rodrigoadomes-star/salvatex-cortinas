const SIGNATURES = {
  "image/jpeg": bytes => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": bytes => bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>bytes[i]===v),
  "image/gif": bytes => bytes.length >= 6 && (ascii(bytes,0,6)==="GIF87a" || ascii(bytes,0,6)==="GIF89a"),
  "image/webp": bytes => bytes.length >= 12 && ascii(bytes,0,4)==="RIFF" && ascii(bytes,8,4)==="WEBP",
  "image/avif": bytes => bytes.length >= 12 && ascii(bytes,4,4)==="ftyp" && ["avif","avis","mif1","msf1"].includes(ascii(bytes,8,4)),
  "video/webm": bytes => bytes.length >= 4 && bytes[0]===0x1a && bytes[1]===0x45 && bytes[2]===0xdf && bytes[3]===0xa3,
  "video/mp4": bytes => isIsoBmff(bytes,["isom","iso2","mp41","mp42","avc1","dash","M4V ","MSNV"]),
  "video/quicktime": bytes => isIsoBmff(bytes,["qt  "])
};

function ascii(bytes,start,length){
  return String.fromCharCode(...bytes.slice(start,start+length));
}

function isIsoBmff(bytes,brands){
  if(bytes.length < 12 || ascii(bytes,4,4)!=="ftyp") return false;
  const brand=ascii(bytes,8,4);
  if(brands.includes(brand)) return true;
  const max=Math.min(bytes.length,64);
  for(let i=16;i+4<=max;i+=4){ if(brands.includes(ascii(bytes,i,4))) return true; }
  return false;
}

export function validateMediaSignature(buffer,mimeType){
  const bytes=new Uint8Array(buffer.slice(0,64));
  const test=SIGNATURES[String(mimeType||"").toLowerCase()];
  if(!test) return {ok:false,reason:"unsupported_mime"};
  try{return test(bytes)?{ok:true}:{ok:false,reason:"signature_mismatch"};}
  catch{return {ok:false,reason:"signature_invalid"};}
}

export function extensionMatchesMime(filename,mimeType){
  const ext=String(filename||"").toLowerCase().split(".").pop();
  const allowed={
    "image/jpeg":["jpg","jpeg"],"image/png":["png"],"image/webp":["webp"],"image/gif":["gif"],"image/avif":["avif"],
    "video/mp4":["mp4"],"video/webm":["webm"],"video/quicktime":["mov"]
  };
  return Boolean(ext && allowed[String(mimeType||"").toLowerCase()]?.includes(ext));
}
