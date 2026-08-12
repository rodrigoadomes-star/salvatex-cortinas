import { json } from "./_lib.js";

export async function onRequestGet(context) {
  if (!context.env.DB) {
    return json({ ok: false, database: false, error: "Binding D1 'DB' não configurado." }, 503);
  }

  try {
    const row = await context.env.DB.prepare("SELECT 1 AS ok").first();
    return json({ ok: row?.ok === 1, database: true, service: "salvatex-api" });
  } catch (error) {
    return json({ ok: false, database: false, error: "Falha ao acessar o banco." }, 500);
  }
}
