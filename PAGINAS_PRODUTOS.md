# Páginas de produtos — Salvatex Admin 6.2

Agora a área **Páginas** permite criar quantas vitrines de produtos forem necessárias.

Exemplos:

- Cortina de Varão
- Cortina de Trilho Suíço
- Persianas
- Trilhos e acessórios
- Promoções
- Pronta entrega

O nome da página é totalmente editável e não depende da categoria do produto.

Cada página possui:

- Nome/título editável;
- slug/URL próprio;
- tipo `Vitrine de produtos` ou `Página de conteúdo`;
- seleção individual dos produtos que aparecem nela;
- imagem de capa opcional;
- SEO título e descrição;
- status publicada/rascunho.

A URL pública segue o formato:

`pagina.html?slug=cortina-de-varao`

A vitrine usa grade de produtos no estilo solicitado, com imagem, nome, preço, parcelamento e link **Ver produto**.

## Migração necessária

Execute o arquivo `database/migration_product_pages_v62.sql` no D1. Como o Console pode não aceitar vários comandos de uma vez, execute cada `ALTER TABLE` separadamente.
