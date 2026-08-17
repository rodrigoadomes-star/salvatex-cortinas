function cleanUrl(value){return String(value??'').trim().slice(0,1200);}

function allowedInternal(url,auth){
  if(url.startsWith('/media/companies/')){
    const prefix=`/media/companies/${auth.companyId}/stores/${auth.storeId}/public/`;
    return url.startsWith(prefix);
  }
  if(url.startsWith('/media/')) return !url.includes('..');
  if(url.startsWith('/imagens/')) return !url.includes('..');
  return false;
}

function allowedExternal(url){
  try{const u=new URL(url);return u.protocol==='https:';}catch{return false;}
}

export function validateProductMediaUrl(value,auth){
  const url=cleanUrl(value);
  if(!url)return {ok:true,url:''};
  if(allowedInternal(url,auth)||allowedExternal(url))return {ok:true,url};
  return {ok:false,url:'',message:'Referência de imagem inválida ou fora da empresa atual.'};
}

export function normalizeProductImages(value,auth,max=12){
  const source=Array.isArray(value)?value:[];
  const result=[];
  for(const raw of source){
    const checked=validateProductMediaUrl(raw,auth);
    if(!checked.ok)return {ok:false,images:[],message:checked.message};
    if(checked.url&&!result.includes(checked.url))result.push(checked.url);
    if(result.length>=max)break;
  }
  return {ok:true,images:result};
}
