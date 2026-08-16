import { json, requireAdmin } from "./_auth.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  let storeName = auth.storeId;
  try {
    const store = await context.env.DB.prepare("SELECT name FROM stores WHERE id=?1 LIMIT 1")
      .bind(auth.storeId).first();
    if (store?.name) storeName = store.name;
  } catch (_) {}

  return json({
    ok: true,
    user: auth.user,
    store: {
      id: auth.storeId,
      name: storeName,
      companyId: auth.companyId
    }
  });
}
