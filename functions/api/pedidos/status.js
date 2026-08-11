import { json } from "../_lib.js";

export async function onRequestGet() {
  // Reservado para uma futura consulta autenticada pelo cliente/admin.
  return json({
    ok: false,
    message: "Consulta pública de pedidos desativada."
  }, 403);
}
