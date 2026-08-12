# Catálogo ligado ao Admin

Produtos e categorias publicados no painel passam a ser expostos pela API pública `/api/catalog` e aparecem em `catalogo.html`.

- Produto de pronta entrega abre `produto.html?slug=...` e pode ser adicionado ao carrinho.
- Produto sob medida abre a página do produto e oferece acesso ao configurador correspondente.
- Categorias inativas e produtos inativos não aparecem na loja.
- Estoque é respeitado quando `track_stock` estiver ativo.

Próximas evoluções: páginas próprias dos configuradores Ilhós, Prega Macho e Persiana; upload de mídia pelo Admin via R2; variantes de pronta entrega.
