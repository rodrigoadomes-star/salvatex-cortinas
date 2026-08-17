const enc=new TextEncoder();
function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function fromB64(v){return Uint8Array.from(atob(v),c=>c.charCodeAt(0))}
async function importKey(secret){const raw=await crypto.subtle.digest('SHA-256',enc.encode(String(secret)));return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function encryptCredential(secret,plaintext,aad=''){
  if(!secret)throw new Error('META_CREDENTIALS_KEY não configurada');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(String(aad))},await importKey(secret),enc.encode(String(plaintext)));
  return{ciphertext:b64(new Uint8Array(data)),iv:b64(iv),version:1};
}
export async function decryptCredential(secret,ciphertext,iv,aad=''){
  if(!secret)throw new Error('META_CREDENTIALS_KEY não configurada');
  const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(iv),additionalData:enc.encode(String(aad))},await importKey(secret),fromB64(ciphertext));
  return new TextDecoder().decode(data);
}
