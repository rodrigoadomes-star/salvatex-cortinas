const encoder=new TextEncoder();
function b64(bytes){return btoa(String.fromCharCode(...bytes))}
function fromB64(value){return Uint8Array.from(atob(String(value||'')),c=>c.charCodeAt(0))}
async function deriveKey(secret){const hash=await crypto.subtle.digest('SHA-256',encoder.encode(String(secret||'')));return crypto.subtle.importKey('raw',hash,{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function encryptSecret(secret,value){if(!secret)throw new Error('META_CREDENTIALS_KEY ausente');const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await deriveKey(secret),encoder.encode(String(value||'')));return{ciphertext:b64(new Uint8Array(encrypted)),iv:b64(iv),version:1}}
export async function decryptSecret(secret,ciphertext,iv){if(!secret)throw new Error('META_CREDENTIALS_KEY ausente');const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(iv)},await deriveKey(secret),fromB64(ciphertext));return new TextDecoder().decode(decrypted)}
