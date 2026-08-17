import { json, requireRadzAdmin } from "./_auth.js";

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  const s = auth.session;
  return json({
    ok: true,
    csrfToken: s.csrf,
    user: {
      id: s.user_id || null,
      name: s.name || "Administrador RADZ HUB",
      email: s.email || null,
      role: s.role,
    },
    legacy: Boolean(s.legacy),
    scope: "platform",
  });
}
