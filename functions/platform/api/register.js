import { audit, clean, digits, hashPassword, json, normalizeEmail, randomToken, sessionCookie, sha256, slugify, validCnpj, validEmail, verifyTurnstile } from "./_lib.js";

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ ok: false, code: "DB_NOT_CONFIGURED" }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  if (!await verifyTurnstile(context.env, context.request, body.turnstileToken)) {
    return json({ ok: false, message: "Confirme que você não é um robô." }, 400);
  }
  const name = clean(body.name, 160);
  const email = normalizeEmail(body.email);
  const phone = digits(body.phone).slice(0, 15);
  const tradeName = clean(body.tradeName, 180);
  const legalName = clean(body.legalName || body.tradeName, 220);
  const cnpj = digits(body.cnpj);
  const segment = clean(body.segment, 120);
  const password = String(body.password || "");
  const slug = slugify(body.storeSlug || tradeName);
  if (name.length < 3 || tradeName.length < 2 || !validEmail(email) || !validCnpj(cnpj)) {
    return json({ ok: false, message: "Revise nome, e-mail e CNPJ." }, 422);
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/.test(password)) {
    return json({ ok: false, message: "A senha precisa ter 10 caracteres, maiúscula, minúscula e número." }, 422);
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)) {
    return json({ ok: false, message: "Escolha outro endereço para a loja." }, 422);
  }
  const exists = await context.env.DB.prepare(`SELECT id FROM platform_companies WHERE document_number=?1 OR slug=?2
      UNION SELECT id FROM platform_users WHERE email=?3 LIMIT 1`).bind(cnpj, slug, email).first();
  if (exists) return json({ ok: false, message: "CNPJ, e-mail ou endereço já cadastrado." }, 409);

  const companyId = `company-${crypto.randomUUID()}`;
  const userId = `user-${crypto.randomUUID()}`;
  const storeId = `store-${crypto.randomUUID()}`;
  const domainId = `domain-${crypto.randomUUID()}`;
  const sessionId = `session-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const passwordData = await hashPassword(password);
  const sessionToken = randomToken(32);
  const tokenHash = await sha256(sessionToken);
  const hostname = `${slug}.radzhub.com.br`;
  const status = String(context.env.PLATFORM_EMAIL_ENFORCE || "false").toLowerCase() === "true" ? "pending_email" : "trial";

  const statements = [
    context.env.DB.prepare(`INSERT INTO platform_companies
      (id,slug,legal_name,trade_name,document_type,document_number,email,phone,segment,status,plan_code,created_at,updated_at)
      VALUES (?1,?2,?3,?4,'cnpj',?5,?6,?7,?8,?9,'free',?10,?10)`)
      .bind(companyId, slug, legalName, tradeName, cnpj, email, phone || null, segment || null, status, now),
    context.env.DB.prepare(`INSERT INTO platform_users
      (id,company_id,name,email,password_hash,password_salt,password_iterations,role,active,created_at,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,'owner',1,?8,?8)`)
      .bind(userId, companyId, name, email, passwordData.hash, passwordData.salt, passwordData.iterations, now),
    context.env.DB.prepare(`INSERT INTO stores
      (id,slug,name,active,platform_fee_percent,platform_fee_minimum_cents,created_at,updated_at)
      VALUES (?1,?2,?3,1,0.01,0,?4,?4)`).bind(storeId, slug, tradeName, now),
    context.env.DB.prepare(`INSERT INTO platform_company_stores (company_id,store_id,created_at) VALUES (?1,?2,?3)`)
      .bind(companyId, storeId, now),
    context.env.DB.prepare(`INSERT INTO platform_domains
      (id,company_id,hostname,domain_type,status,created_at,updated_at)
      VALUES (?1,?2,?3,'platform_subdomain','pending',?4,?4)`).bind(domainId, companyId, hostname, now),
    context.env.DB.prepare(`INSERT INTO store_configs (store_id,config_key,value_json,updated_at)
      VALUES (?1,'site_config',?2,?3)`).bind(storeId, JSON.stringify({ storeName: tradeName, theme: "starter", configured: false }), now),
    context.env.DB.prepare(`INSERT INTO platform_sessions
      (id,user_id,company_id,token_hash,expires_at,created_at,last_seen_at)
      VALUES (?1,?2,?3,?4,?5,?6,?6)`).bind(sessionId, userId, companyId, tokenHash, expires, now)
  ];
  for (const feature of ["catalog","orders","customers","site_builder","platform_subdomain"]) {
    statements.push(context.env.DB.prepare(`INSERT INTO platform_features
      (company_id,feature_key,enabled,settings_json,updated_at) VALUES (?1,?2,1,'{}',?3)`).bind(companyId, feature, now));
  }
  await context.env.DB.batch(statements);
  await audit(context.env, context.request, "company.registered", companyId, userId, { plan: "free" });
  return json({ ok: true, company: { id: companyId, name: tradeName, slug, hostname, status }, redirect: "/platform-admin/" }, 201, {
    "set-cookie": sessionCookie(sessionToken)
  });
}


