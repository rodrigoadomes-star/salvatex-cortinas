const enc = new TextEncoder();
export function normalizeEmail(value){return String(value||'').trim().toLowerCase()}
export function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254}
export function validPassword(value){return typeof value==='string'&&value.length>=10&&value.length<=128&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/\d/.test(value)}
function b64(bytes){return btoa(String.fromCharCode(...bytes))}
function bytes(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
export async function hashPassword(password,saltValue){const salt=saltValue?bytes(saltValue):crypto.getRandomValues(new Uint8Array(16));const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const derived=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},material,256);return{salt:b64(salt),hash:b64(new Uint8Array(derived)),iterations:310000}}
export async function verifyPassword(password,row){const result=await hashPassword(password,row.password_salt);const a=bytes(result.hash),b=bytes(row.password_hash||'');if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0}
export async function hashIdentifier(value){const d=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));return b64(new Uint8Array(d))}

