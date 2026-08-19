import { requirePlatformSession } from "./_auth.js";
import { clearSessionCookie, cookie, json, sha256 } from "./_lib.js";

export async function onRequestGet(context) {
  const auth = await requirePlatformSession(context);
  if (!auth.ok) return auth.response;
  const s = auth.session;
  return json({ ok: true, user: { id:s.user_id,name:s.name,email:s.email,role:s.role }, company: s.company_id ? { id:s.company_id,name:s.trade_name,slug:s.slug,status:s.company_status,plan:s.plan_code } : null });
}

export async function onRequestDelete(context) {
  const raw = cookie(context.request, "radzhub_session");
  if (raw && context.env.DB) await context.env.DB.prepare("DELETE FROM platform_sessions WHERE token_hash=?1").bind(await sha256(raw)).run();
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(context.request) });
}
