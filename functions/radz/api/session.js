import { json, requireRadzAdmin } from "./_auth.js";

export async function onRequestGet(context) {
  const auth = await requireRadzAdmin(context);
  if (!auth.ok) return auth.response;
  const s = auth.session;
  const roles = Array.isArray(s.roles) && s.roles.length ? s.roles : [s.role].filter(Boolean);
  return json({
    ok: true,
    csrfToken: s.csrf,
    user: {
      id: s.user_id || null,
      name: s.name || "Administrador RADZ HUB",
      email: s.email || null,
      role: s.role,
      roles,
    },
    legacy: Boolean(s.legacy),
    scope: "platform",
  });
}
