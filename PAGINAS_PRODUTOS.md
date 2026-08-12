# Salvatex — Páginas de Produtos

Este é o documento único da estrutura de páginas/vitrines de produtos.

## O que o sistema permite

No Admin > Páginas é possível criar páginas como:

- Cortina de Varão
- Cortina de Trilho Suíço
- Persianas
- Pronta entrega
- Promoções
- Qualquer outra página de produtos

O nome da página é totalmente editável.

## Tipo de página

Uma página pode funcionar como vitrine de produtos, sem depender do nome da categoria.

Cada página possui:

- título;
- slug;
- descrição/conteúdo;
- imagem principal opcional;
- produtos vinculados;
- medidas próprias;
- destino para medida específica;
- status ativo/inativo.

## Produtos vinculados à página

Cada página escolhe quais produtos aparecem nela.

Isso permite, por exemplo, ter o mesmo produto em mais de uma página.

## Medidas vinculadas à página

Cada página pode possuir suas próprias medidas.

Exemplo para Cortina de Trilho Suíço:

- 1,50 m
- 2,00 m
- 2,50 m
- 3,00 m
- 3,50 m
- 4,00 m
- 4,50 m
- 5,00 m

Dentro de cada medida, o Admin escolhe exatamente quais produtos serão exibidos.

Fluxo:

Página → Medida → Produtos daquela medida.

## Medida específica

Cada página pode definir um destino para:

**Tenho uma medida específica**

Exemplo:

- abrir o configurador Wave;
- abrir outro configurador sob medida;
- abrir uma página específica.

## Página pública

As vitrines públicas usam:

`pagina.html?slug=slug-da-pagina`

Exemplo:

`pagina.html?slug=cortina-de-varao`

## Catálogo e produto

Também fazem parte da estrutura:

- `catalogo.html`
- `produto.html`
- `pagina.html`

## Banco de dados

O arquivo único para evoluções da área administrativa é:

`database/admin_schema.sql`

Não serão mais criados arquivos como:

- migration_product_pages_v62.sql
- migration_page_measures_v63.sql
- migration_xxx_v64.sql

As próximas alterações do Admin serão consolidadas nesse mesmo arquivo.

## Observação sobre o D1

Os comandos `ALTER TABLE ... ADD COLUMN` devem ser executados apenas uma vez.

Se uma coluna já existir no banco, não execute novamente o comando correspondente.
