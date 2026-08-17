import { clearAdminCookie, json, requireAdmin } from "./_auth.js";

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  try {
    await context.env.DB.prepare("DELETE FROM platform_sessions WHERE id=?1 AND user_id=?2")
      .bind(auth.session.session_id, auth.user.id).run();
  } catch (_) {}
  return json({ ok: true }, 200, { "set-cookie": clearAdminCookie() });
}
