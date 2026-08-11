# Salvatex Admin V6 — Pedidos operacionais

Esta versão evolui a área **Pedidos** do painel administrativo sem exigir nova migração do D1.

## O que mudou

- Lista de pedidos com busca por número, cliente, e-mail ou telefone.
- Filtro automático por status.
- Clique em qualquer linha para abrir o pedido.
- Detalhes completos de cliente, contato, endereço, pagamento e frete.
- Itens do pedido com configurações do produto quando disponíveis.
- Resumo financeiro com subtotal, frete, desconto e total.
- Fluxo visual de status: aguardando pagamento → pago → produção → pronto → enviado → entregue.
- Alteração manual de status com histórico no `order_events`.
- Transportadora, código e link de rastreio gravados no `freight_json`.
- Observações internas gravadas em `orders.internal_notes`.
- Histórico administrativo e registro em `admin_logs`.
- Botão para copiar um resumo rápido do pedido.

## Banco de dados

Nenhuma nova tabela ou coluna é necessária para esta versão. Ela utiliza campos que já existem no schema V4/V5:

- `orders.internal_notes`
- `orders.freight_json`
- `orders.payment_json`
- `orders.status`
- `orders.stage`
- `order_events`
- `admin_logs`

Depois de substituir os arquivos no GitHub, aguarde o novo deploy do Cloudflare Pages e abra `/admin/#orders`.
