import { audit, clean, digits, hashPassword, json, normalizeEmail, randomToken, sessionCookie, sha256, slugify, validCnpj, validEmail, verifyTurnstileDetailed } from "./_lib.js";

const TERMS_VERSION = "2026-08-16-v1";
const PRIVACY_VERSION = "2026-08-16-v1";

function turnstileFailure(result) {
  const configError = ["TURNSTILE_SECRET_MISSING", "TURNSTILE_SECRET_INVALID", "TURNSTILE_SITEVERIFY_UNAVAILABLE", "TURNSTILE_SITEVERIFY_HTTP", "TURNSTILE_SITEVERIFY_INVALID_RESPONSE"].includes(result.code);
  return json({
    ok: false,
    code: result.code,
    message: configError
      ? "A verificação de segurança está temporariamente indisponível. Tente novamente em instantes."
      : "Confirme que você não é um robô."
  }, configError ? 503 : 400);
}

function dbErrorCode(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (message.includes("unique constraint") || message.includes("constraint failed") || message.includes("primary key")) return "REGISTER_CONFLICT";
  if (message.includes("foreign key")) return "REGISTER_RELATION_FAILED";
  if (message.includes("no such table") || message.includes("no column") || message.includes("has no column")) return "REGISTER_SCHEMA_MISMATCH";
  return "REGISTER_DB_WRITE_FAILED";
}

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ ok: false, code: "DB_NOT_CONFIGURED", message: "Banco de dados temporariamente indisponível." }, 503);

  const requestId = crypto.randomUUID().slice(0, 12);
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "Dados inválidos." }, 400);
  }

  const turnstile = await verifyTurnstileDetailed(context.env, context.request, body.turnstileToken);
  if (!turnstile.ok) return turnstileFailure(turnstile);

  if (!(body.terms === true || body.terms === "on" || body.terms === "true")) {
    return json({ ok: false, code: "LEGAL_ACCEPTANCE_REQUIRED", message: "Para criar a conta, leia e aceite os Termos de Uso e a Política de Privacidade." }, 422);
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
  const hostname = `${slug}.radzhub.com.br`;

  if (name.length < 3 || tradeName.length < 2 || !validEmail(email) || !validCnpj(cnpj)) {
    return json({ ok: false, code: "INVALID_REGISTRATION_DATA", message: "Revise nome, e-mail e CNPJ." }, 422);
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/.test(password)) {
    return json({ ok: false, code: "WEAK_PASSWORD", message: "A senha precisa ter 10 caracteres, maiúscula, minúscula e número." }, 422);
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)) {
    return json({ ok: false, code: "INVALID_STORE_SLUG", message: "Escolha outro endereço para a loja." }, 422);
  }

  // Confere todas as superfícies UNIQUE envolvidas no batch. Antes, apenas company/user
  // eram verificados; um store/domain legado com o mesmo slug causava erro 500 opaco.
  try {
    const [companyDocument, companySlug, userEmail, storeSlug, domainHostname] = await Promise.all([
      context.env.DB.prepare("SELECT id FROM platform_companies WHERE document_number=?1 LIMIT 1").bind(cnpj).first(),
      context.env.DB.prepare("SELECT id FROM platform_companies WHERE slug=?1 LIMIT 1").bind(slug).first(),
      context.env.DB.prepare("SELECT id FROM platform_users WHERE email=?1 LIMIT 1").bind(email).first(),
      context.env.DB.prepare("SELECT id FROM stores WHERE slug=?1 LIMIT 1").bind(slug).first(),
      context.env.DB.prepare("SELECT id FROM platform_domains WHERE hostname=?1 LIMIT 1").bind(hostname).first()
    ]);

    if (companyDocument) return json({ ok: false, code: "CNPJ_ALREADY_REGISTERED", message: "Este CNPJ já possui cadastro." }, 409);
    if (userEmail) return json({ ok: false, code: "EMAIL_ALREADY_REGISTERED", message: "Este e-mail já possui cadastro. Use a tela de login." }, 409);
    if (companySlug || storeSlug || domainHostname) {
      return json({ ok: false, code: "STORE_ADDRESS_TAKEN", message: "Este endereço de loja já está reservado. Escolha outro endereço." }, 409);
    }
  } catch (error) {
    console.error("[RADZ register preflight]", requestId, String(error?.message || error));
    return json({ ok: false, code: "REGISTER_PREFLIGHT_FAILED", message: `Não foi possível validar o cadastro agora. Referência: ${requestId}.` }, 503);
  }

  // Migração aditiva de compatibilidade. Não altera nem remove dados existentes.
  try {
    await context.env.DB.prepare(`CREATE TABLE IF NOT EXISTS platform_legal_acceptances (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      terms_version TEXT NOT NULL,
      privacy_version TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      ip_hash TEXT,
      user_agent TEXT,
      source TEXT NOT NULL DEFAULT 'signup',
      FOREIGN KEY (company_id) REFERENCES platform_companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES platform_users(id) ON DELETE CASCADE
    )`).run();
  } catch (error) {
    console.error("[RADZ register legal-schema]", requestId, String(error?.message || error));
    return json({ ok: false, code: "REGISTER_SCHEMA_MISMATCH", message: `A estrutura de cadastro precisa ser atualizada. Referência: ${requestId}.` }, 503);
  }

  const companyId = `company-${crypto.randomUUID()}`;
  const userId = `user-${crypto.randomUUID()}`;
  const storeId = `store-${crypto.randomUUID()}`;
  const domainId = `domain-${crypto.randomUUID()}`;
  const sessionId = `session-${crypto.randomUUID()}`;
  const acceptanceId = `accept-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  let passwordData;
  try {
    passwordData = await hashPassword(password);
  } catch (error) {
    console.error("[RADZ register password]", requestId, String(error?.message || error));
    return json({ ok: false, code: "PASSWORD_HASH_FAILED", message: `Não foi possível proteger a senha neste momento. Referência: ${requestId}.` }, 503);
  }

  const sessionToken = randomToken(32);
  const tokenHash = await sha256(sessionToken);
  const status = String(context.env.PLATFORM_EMAIL_ENFORCE || "false").toLowerCase() === "true" ? "pending_email" : "trial";
  const rawIp = context.request.headers.get("CF-Connecting-IP") || "";
  const ipHash = rawIp ? await sha256(rawIp) : null;
  const userAgent = clean(context.request.headers.get("User-Agent") || "", 300) || null;

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
      VALUES (?1,?2,?3,?4,?5,?6,?6)`).bind(sessionId, userId, companyId, tokenHash, expires, now),
    context.env.DB.prepare(`INSERT INTO platform_legal_acceptances
      (id,company_id,user_id,terms_version,privacy_version,accepted_at,ip_hash,user_agent,source)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'signup')`)
      .bind(acceptanceId, companyId, userId, TERMS_VERSION, PRIVACY_VERSION, now, ipHash, userAgent)
  ];

  for (const feature of ["catalog", "orders", "customers", "site_builder", "platform_subdomain"]) {
    statements.push(context.env.DB.prepare(`INSERT INTO platform_features
      (company_id,feature_key,enabled,settings_json,updated_at) VALUES (?1,?2,1,'{}',?3)`).bind(companyId, feature, now));
  }

  // D1 batch é usado como unidade atômica: empresa, usuário, loja, domínio, sessão e
  // permissões nascem juntos; em falha, o cadastro não deve ficar parcialmente criado.
  try {
    await context.env.DB.batch(statements);
  } catch (error) {
    const code = dbErrorCode(error);
    console.error("[RADZ register batch]", requestId, code, String(error?.message || error));
    const statusCode = code === "REGISTER_CONFLICT" ? 409 : 503;
    const message = code === "REGISTER_CONFLICT"
      ? "Algum dado deste cadastro acabou de ser utilizado por outra conta. Revise e tente novamente."
      : `Não foi possível gravar o cadastro no banco de dados. Referência: ${requestId}.`;
    return json({ ok: false, code, message }, statusCode);
  }

  // Auditoria é importante, mas não pode transformar um cadastro já confirmado em falso erro.
  // Em eventual indisponibilidade do log, preserva-se o cadastro e registra-se a falha no runtime.
  try {
    await audit(context.env, context.request, "company.registered", companyId, userId, {
      plan: "free",
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      requestId
    });
  } catch (error) {
    console.error("[RADZ register audit]", requestId, String(error?.message || error));
  }

  return json({
    ok: true,
    company: { id: companyId, name: tradeName, slug, hostname, status },
    redirect: "/platform-admin/"
  }, 201, {
    "set-cookie": sessionCookie(sessionToken)
  });
}
