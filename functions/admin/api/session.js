import { json, requireAdmin } from "./_auth.js";
export async function onRequestGet(context) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth.response;
  return json({ ok:true, user:{ name:"Administrador", role:"owner" }, store:{ id:"salvatex", name:"Salvatex Cortinas" } });
}
