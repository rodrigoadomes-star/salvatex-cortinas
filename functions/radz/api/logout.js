import { auditRadz, clearCookie, json, requireRadzAdmin, revokeCurrentSession } from "./_auth.js";

export async function onRequestPost(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  await auditRadz(context, auth, "platform.admin.logout", "platform_user", auth.session.user_id || null, {});
  await revokeCurrentSession(context).catch(() => {});
  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
}
