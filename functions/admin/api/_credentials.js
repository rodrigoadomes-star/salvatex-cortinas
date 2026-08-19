const encoder = new TextEncoder();

function bytesToHex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
function hexToBytes(value){return new Uint8Array((String(value||'').match(/.{1,2}/g)||[]).map(x=>parseInt(x,16)))}
export function normalizeEmail(value){return String(value||'').trim().toLowerCase().slice(0,320)}
export function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||''))}
export function randomToken(size=32){const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return bytesToHex(bytes)}
export async function sha256(value){return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(String(value||'')))))}
export async function hashPassword(password,salt=randomToken(16),iterations=100000){
  const material=await crypto.subtle.importKey('raw',encoder.encode(String(password)),{name:'PBKDF2'},false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:hexToBytes(salt),iterations:Number(iterations)||100000},material,256);
  return{hash:bytesToHex(new Uint8Array(bits)),salt,iterations:Number(iterations)||100000};
}
export async function verifyPassword(password,expectedHash,salt,iterations){
  const actual=await hashPassword(password,salt,Number(iterations)||100000);
  const a=encoder.encode(actual.hash),b=encoder.encode(String(expectedHash||''));
  if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}

export async function ensureAdminAuthSchema(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    password_iterations INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    session_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(store_id,email)
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_users_store ON admin_users(store_id,active)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_resets_user ON admin_password_resets(user_id,created_at)`).run();
}

export async function ensurePlatformCompanyAdmin(db,store,email){
  if(!store||!email)return null;
  const normalized=normalizeEmail(email);
  const existing=await db.prepare(`SELECT id,email,password_hash,active FROM admin_users WHERE store_id=?1 AND email=?2 LIMIT 1`)
    .bind(String(store.id),normalized).first();
  if(existing)return existing;

  const platformUser=await db.prepare(`SELECT u.id,u.email,u.password_hash,u.password_salt,u.password_iterations,u.active
    FROM platform_company_stores pcs
    JOIN platform_users u ON u.company_id=pcs.company_id
    WHERE pcs.store_id=?1 AND lower(u.email)=?2 AND u.active=1
    ORDER BY CASE WHEN u.role='owner' THEN 0 ELSE 1 END, u.created_at ASC
    LIMIT 1`)
    .bind(String(store.id),normalized).first();
  if(!platformUser)return null;

  const now=new Date().toISOString();
  const id=`admin-platform-${String(platformUser.id)}`;
  await db.prepare(`INSERT OR IGNORE INTO admin_users(id,store_id,email,password_hash,password_salt,password_iterations,active,session_version,created_at,updated_at)
    VALUES(?1,?2,?3,?4,?5,?6,1,1,?7,?7)`)
    .bind(id,String(store.id),normalized,platformUser.password_hash||null,platformUser.password_salt||null,platformUser.password_iterations||null,now).run();
  return db.prepare(`SELECT id,email,password_hash,active FROM admin_users WHERE store_id=?1 AND email=?2 LIMIT 1`)
    .bind(String(store.id),normalized).first();
}

export async function ensureLegacySalvatexAdmin(db,store){
  if(!store||String(store.slug)!=='salvatex')return;
  const email='rodrigo.adurante@gmail.com';
  const now=new Date().toISOString();
  await db.prepare(`INSERT OR IGNORE INTO admin_users(id,store_id,email,active,session_version,created_at,updated_at)
    VALUES(?1,?2,?3,1,1,?4,?4)`)
    .bind('admin-salvatex-rodrigo',String(store.id),email,now).run();
}

export async function sendResetEmail(env,{to,storeName,resetUrl}){
  if(!env.RESEND_API_KEY||!env.EMAIL_FROM)throw new Error('E-mail transacional não configurado.');
  const subject=`Redefinição de senha — ${storeName||'RADZ HUB'}`;
  const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7f9;padding:32px;color:#101828"><div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:32px"><h2 style="margin-top:0">Redefinir senha</h2><p>Recebemos uma solicitação para redefinir a senha do painel administrativo de <strong>${escapeHtml(storeName||'sua empresa')}</strong>.</p><p style="margin:28px 0"><a href="${escapeHtml(resetUrl)}" style="background:#071b2e;color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;display:inline-block">Criar nova senha</a></p><p>Este link é de uso único e expira em 20 minutos.</p><p style="font-size:13px;color:#667085">Se você não solicitou esta alteração, ignore este e-mail.</p></div></body></html>`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,html})});
  if(!response.ok){const detail=await response.text().catch(()=>'');throw new Error(`Falha ao enviar e-mail (${response.status})${detail?`: ${detail.slice(0,300)}`:''}.`)}
  return response.json().catch(()=>({}));
}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
