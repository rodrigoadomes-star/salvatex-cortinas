const encoder = new TextEncoder();

function b64u(bytes){
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g,"-")
    .replace(/\//g,"_")
    .replace(/=+$/g,"");
}

function fromB64u(value){
  let s=String(value||"").replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4)s+="=";
  return Uint8Array.from(atob(s),c=>c.charCodeAt(0));
}

async function hmacKey(secret){
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {name:"HMAC",hash:"SHA-256"},
    false,
    ["sign","verify"]
  );
}

export async function createMetaState(secret){
  const payload={
    provider:"meta",
    iat:Date.now(),
    exp:Date.now()+10*60*1000,
    nonce:crypto.randomUUID()
  };
  const body=b64u(encoder.encode(JSON.stringify(payload)));
  const sig=b64u(new Uint8Array(await crypto.subtle.sign("HMAC",await hmacKey(secret),encoder.encode(body))));
  return `${body}.${sig}`;
}

export async function verifyMetaState(secret,state){
  if(!secret||!state)return null;
  const [body,sig]=String(state).split(".");
  if(!body||!sig)return null;
  try{
    const ok=await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromB64u(sig),
      encoder.encode(body)
    );
    if(!ok)return null;
    const payload=JSON.parse(new TextDecoder().decode(fromB64u(body)));
    if(payload.provider!=="meta"||Number(payload.exp)<=Date.now())return null;
    return payload;
  }catch{
    return null;
  }
}
