# Painel de Pedidos V6.1

Atualização focada em observações internas do pedido.

- Campo de observações internas em destaque no detalhe do pedido.
- Botão próprio **Salvar observação**.
- Contador de até 5.000 caracteres.
- Informação visível somente no painel administrativo.
- Registro no histórico como `admin_internal_note_updated`.
- Registro administrativo como `order_internal_note_updated`.
- Nenhuma migração adicional no D1 é necessária: utiliza `orders.internal_notes`, já existente.
- Assets do Admin usam `?v=6.1.0` para evitar cache da versão anterior.
