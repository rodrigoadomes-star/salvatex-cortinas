# Salvatex — arquitetura preparada para Admin

## Produto universal
Cada item do carrinho agora pode carregar: categoria, tipoVenda, configurador, sku, nome, imagem, quantidade, valorUnitario, total, detalhes e dados.

Tipos de venda previstos:
- sob_medida: cortinas e persianas configuráveis
- pronta_entrega: produtos com estoque/quantidade

Configuradores previstos:
- cortina (Wave, Ilhós, Prega Macho etc.)
- persiana (Rolô, Romana, Double Vision etc.)
- complemento_cortina (trilhos/varões)

Carrinho, checkout e pagamento renderizam itens e categorias de forma genérica.

## Pedido universal V3
`js/pedido-core.js` centraliza número, ID, itens, cliente, entrega, frete, pagamento, antifraude, totais, status, etapa e datas.
O armazenamento ainda é localStorage nesta fase. Quando o backend for criado, a interface poderá ser mantida e a persistência migrada para API/banco.

## Cobrança da plataforma reservada
A configuração-base está registrada no core do pedido:
- 1% do faturamento processado pelo site
- mínimo mensal R$ 150
- cobrança prevista via PIX ou boleto

O cálculo e a geração da cobrança serão implementados no backend/painel Admin, não no navegador do lojista.

## Próxima fase
Criar backend/banco e endpoint de pedidos. Depois migrar produtos/configurações para banco para que o painel Admin possa cadastrar e alterar produtos sem editar JavaScript.
