# Salvatex Admin — Painel de Pedidos

Documento único da área de pedidos do painel administrativo.

## Recursos disponíveis

- Lista de pedidos com busca por número, cliente, e-mail ou telefone.
- Filtro por status.
- Clique no pedido para abrir os detalhes.
- Dados completos do cliente, contato, endereço, pagamento e frete.
- Itens do pedido com configurações do produto quando disponíveis.
- Resumo financeiro com subtotal, frete, desconto e total.
- Fluxo de status:
  aguardando pagamento → pago → produção → pronto → enviado → entregue.
- Alteração manual de status com registro no histórico.
- Transportadora, código e link de rastreio gravados no pedido.
- Observações internas em destaque no detalhe do pedido.
- Botão próprio **Salvar observação**.
- Contador de até 5.000 caracteres.
- Observações visíveis somente no painel administrativo.
- Registro das observações e alterações em `order_events` e `admin_logs`.
- Botão para copiar resumo rápido do pedido.
- Assets do Admin com versão para evitar cache antigo.

## Banco de dados

Nenhuma nova migração é necessária para esta atualização.

A área de pedidos utiliza estruturas já existentes:

- `orders.internal_notes`
- `orders.freight_json`
- `orders.payment_json`
- `orders.status`
- `orders.stage`
- `order_events`
- `admin_logs`

## Arquivos desta atualização

- `admin/index.html`
- `css/admin.css`
- `js/admin.js`
- `functions/admin/api/orders/[id].js`

## Organização do repositório

Mantenha apenas este documento na raiz:

`PAINEL_PEDIDOS.md`

Os documentos antigos:

- `PAINEL_PEDIDOS_V6.md`
- `PAINEL_PEDIDOS_V6_1.md`

podem ser removidos, pois todo o conteúdo relevante foi consolidado aqui.
