import { auditRadz, json, requireRadzAdmin } from "./_auth.js";
import { clean, nowIso, parseJson } from "./_policy.js";

const STATUSES = ["pending_email", "trial", "active", "suspended", "cancelled"];

function digits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function companySelect() {
  return `SELECT c.id,c.slug,c.legal_name,c.trade_name,c.document_type,c.document_number,
    c.email,c.phone,c.segment,c.status,c.plan_code,c.platform_fee_basis_points,c.created_at,c.updated_at,
    p.whatsapp,p.address_json,p.logo_object_key,p.favicon_object_key,p.trial_ends_at,p.billing_due_at,
    COALESCE(p.access_blocked,0) access_blocked,p.deleted_at,p.last_activity_at,
    s.id store_id,s.active store_active,
    (SELECT COUNT(*) FROM platform_domains d WHERE d.company_id=c.id AND d.status='active') active_domains,
    (SELECT COUNT(*) FROM platform_domains d WHERE d.company_id=c.id) total_domains,
    (SELECT COUNT(*) FROM platform_users u WHERE u.company_id=c.id AND u.active=1) active_users,
    (SELECT COUNT(*) FROM products pr WHERE pr.store_id=s.id) products_used,
    (SELECT COUNT(*) FROM orders o WHERE o.store_id=s.id) total_orders
  FROM platform_companies c
  LEFT JOIN platform_company_profile p ON p.company_id=c.id
  LEFT JOIN platform_company_stores pcs ON pcs.company_id=c.id
  LEFT JOIN stores s ON s.id=pcs.store_id`;
}

function mapCompany(row) {
  if (!row) return row;
  return {
    ...row,
    access_blocked: Boolean(row.access_blocked),
    address: parseJson(row.address_json, {}),
  };
}

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const id = clean(url.searchParams.get("id"), 100);
  if (id) {
    const company = mapCompany(await context.env.DB.prepare(`${companySelect()} WHERE c.id=?1 LIMIT 1`).bind(id).first());
    if (!company) return json({ ok: false, message: "Empresa não encontrada." }, 404);
    const [domains, users, featureOverrides, limitOverrides] = await Promise.all([
      context.env.DB.prepare(`SELECT id,hostname,domain_type,status,verification_method,verification_error,verified_at,created_at,updated_at
        FROM platform_domains WHERE company_id=?1 ORDER BY created_at DESC`).bind(id).all(),
      context.env.DB.prepare(`SELECT id,name,email,role,email_verified_at,active,created_at,updated_at
        FROM platform_users WHERE company_id=?1 ORDER BY active DESC,name`).bind(id).all(),
      context.env.DB.prepare(`SELECT feature_key,state,settings_json,expires_at,updated_at
        FROM platform_company_feature_overrides WHERE company_id=?1 ORDER BY feature_key`).bind(id).all(),
      context.env.DB.prepare(`SELECT id,limit_key,mode,limit_value,reason,starts_at,expires_at,active,created_at,updated_at
        FROM platform_company_limit_overrides WHERE company_id=?1 ORDER BY created_at DESC`).bind(id).all(),
    ]);
    return json({ ok: true, company, domains: domains.results || [], users: users.results || [], featureOverrides: featureOverrides.results || [], limitOverrides: limitOverrides.results || [] });
  }

  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get("pageSize") || 25)));
  const search = clean(url.searchParams.get("search"), 120);
  const status = clean(url.searchParams.get("status"), 30);
  const plan = clean(url.searchParams.get("plan"), 60);
  const includeDeleted = url.searchParams.get("includeDeleted") === "1";
  const sort = clean(url.searchParams.get("sort"), 30);
  const orderBy = sort === "name" ? "c.trade_name COLLATE NOCASE ASC" : sort === "status" ? "c.status,c.trade_name" : "c.created_at DESC";

  const where = [];
  const values = [];
  if (!includeDeleted) where.push("p.deleted_at IS NULL");
  if (search) {
    values.push(`%${search}%`);
    const n = values.length;
    where.push(`(c.trade_name LIKE ?${n} OR c.legal_name LIKE ?${n} OR c.email LIKE ?${n} OR c.document_number LIKE ?${n})`);
  }
  if (STATUSES.includes(status)) {
    values.push(status);
    where.push(`c.status=?${values.length}`);
  }
  if (plan) {
    values.push(plan);
    where.push(`c.plan_code=?${values.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countStmt = context.env.DB.prepare(`SELECT COUNT(*) total FROM platform_companies c LEFT JOIN platform_company_profile p ON p.company_id=c.id ${whereSql}`);
  const listStmt = context.env.DB.prepare(`${companySelect()} ${whereSql} ORDER BY ${orderBy} LIMIT ?${values.length + 1} OFFSET ?${values.length + 2}`);
  const bindings = [...values, pageSize, (page - 1) * pageSize];
  const [count, list] = await Promise.all([
    values.length ? countStmt.bind(...values).first() : countStmt.first(),
    listStmt.bind(...bindings).all(),
  ]);

  return json({
    ok: true,
    companies: (list.results || []).map(mapCompany),
    pagination: { page, pageSize, total: Number(count?.total || 0), pages: Math.ceil(Number(count?.total || 0) / pageSize) },
  });
}

export async function onRequestPatch(context) {
  const auth = await requireRadzAdmin(context, ["platform_owner"]);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Dados inválidos." }, 400); }
  const id = clean(body.id, 100);
  if (!id) return json({ ok: false, message: "Empresa obrigatória." }, 422);

  const current = await context.env.DB.prepare(`SELECT c.*,p.whatsapp,p.address_json,p.logo_object_key,p.favicon_object_key,
      p.trial_ends_at,p.billing_due_at,p.access_blocked,p.deleted_at,p.last_activity_at
    FROM platform_companies c LEFT JOIN platform_company_profile p ON p.company_id=c.id WHERE c.id=?1`).bind(id).first();
  if (!current) return json({ ok: false, message: "Empresa não encontrada." }, 404);

  const now = nowIso();
  if (body.action === "softDelete" || body.action === "restore") {
    const deletedAt = body.action === "softDelete" ? now : null;
    await context.env.DB.prepare(`INSERT INTO platform_company_profile(company_id,deleted_at,updated_at)
      VALUES (?1,?2,?3)
      ON CONFLICT(company_id) DO UPDATE SET deleted_at=excluded.deleted_at,updated_at=excluded.updated_at`)
      .bind(id, deletedAt, now).run();
    await auditRadz(context, auth, body.action === "softDelete" ? "platform.company.soft_deleted" : "platform.company.restored", "company", id, {});
    return json({ ok: true });
  }

  const status = body.status == null ? current.status : body.status;
  if (!STATUSES.includes(status)) return json({ ok: false, message: "Status inválido." }, 422);
  const documentType = body.documentType == null ? current.document_type : clean(body.documentType, 10);
  const documentNumber = body.documentNumber == null ? current.document_number : digits(body.documentNumber);
  if (!["cpf", "cnpj"].includes(documentType)) return json({ ok: false, message: "Tipo de documento inválido." }, 422);
  if ((documentType === "cnpj" && documentNumber.length !== 14) || (documentType === "cpf" && documentNumber.length !== 11)) {
    return json({ ok: false, message: "Documento inválido." }, 422);
  }

  const fee = body.platformFeeBasisPoints == null ? Number(current.platform_fee_basis_points) : Math.max(0, Math.min(10000, Math.round(Number(body.platformFeeBasisPoints))));
  if (!Number.isFinite(fee)) return json({ ok: false, message: "Taxa inválida." }, 422);

  const core = {
    slug: clean(body.slug ?? current.slug, 63),
    legalName: clean(body.legalName ?? current.legal_name, 160),
    tradeName: clean(body.tradeName ?? current.trade_name, 160),
    email: clean(body.email ?? current.email, 320).toLowerCase(),
    phone: clean(body.phone ?? current.phone, 40),
    segment: clean(body.segment ?? current.segment, 120),
    planCode: clean(body.planCode ?? current.plan_code, 60),
  };
  if (!core.slug || !core.legalName || !core.tradeName || !core.email || !core.planCode) return json({ ok: false, message: "Campos obrigatórios ausentes." }, 422);
  const plan = await context.env.DB.prepare("SELECT code FROM platform_plans WHERE code=?1 AND deleted_at IS NULL").bind(core.planCode).first();
  if (!plan) return json({ ok: false, message: "Plano não encontrado." }, 422);

  const addressJson = JSON.stringify(body.address ?? parseJson(current.address_json, {}));
  const accessBlocked = body.accessBlocked == null ? Number(current.access_blocked || 0) : (body.accessBlocked ? 1 : 0);
  const before = {
    tradeName: current.trade_name,
    status: current.status,
    planCode: current.plan_code,
    accessBlocked: Boolean(current.access_blocked),
    fee: Number(current.platform_fee_basis_points),
  };

  await context.env.DB.batch([
    context.env.DB.prepare(`UPDATE platform_companies SET slug=?1,legal_name=?2,trade_name=?3,document_type=?4,document_number=?5,
      email=?6,phone=?7,segment=?8,status=?9,plan_code=?10,platform_fee_basis_points=?11,updated_at=?12 WHERE id=?13`)
      .bind(core.slug, core.legalName, core.tradeName, documentType, documentNumber, core.email, core.phone || null, core.segment || null, status, core.planCode, fee, now, id),
    context.env.DB.prepare(`INSERT INTO platform_company_profile
      (company_id,whatsapp,address_json,logo_object_key,favicon_object_key,trial_ends_at,billing_due_at,access_blocked,last_activity_at,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
      ON CONFLICT(company_id) DO UPDATE SET whatsapp=excluded.whatsapp,address_json=excluded.address_json,
      logo_object_key=excluded.logo_object_key,favicon_object_key=excluded.favicon_object_key,
      trial_ends_at=excluded.trial_ends_at,billing_due_at=excluded.billing_due_at,
      access_blocked=excluded.access_blocked,last_activity_at=COALESCE(excluded.last_activity_at,platform_company_profile.last_activity_at),
      updated_at=excluded.updated_at`)
      .bind(id, clean(body.whatsapp ?? current.whatsapp, 40) || null, addressJson, clean(body.logoObjectKey ?? current.logo_object_key, 500) || null,
        clean(body.faviconObjectKey ?? current.favicon_object_key, 500) || null, body.trialEndsAt ?? current.trial_ends_at,
        body.billingDueAt ?? current.billing_due_at, accessBlocked, body.lastActivityAt ?? current.last_activity_at, now),
  ]);

  await auditRadz(context, auth, "platform.company.updated", "company", id, {
    before,
    after: { tradeName: core.tradeName, status, planCode: core.planCode, accessBlocked: Boolean(accessBlocked), fee },
  });
  return json({ ok: true });
}
