# Tipos de página simplificados

No Painel Admin > Páginas, o campo **Tipo de página** agora possui:

- Vitrine de produtos
- Página de conteúdo
- Cortina Wave sob medida
- Cortina Prega Macho sob medida
- Cortina de Ilhós sob medida
- Persiana sob medida

## Como funciona

### Vitrine de produtos
Use para páginas que exibem produtos cadastrados, como:
- Cortina para Varão pronta entrega
- Cortina Wave pronta entrega
- Trilhos e acessórios

Você escolhe os produtos que aparecem dentro da página.

### Página de conteúdo
Use para textos institucionais, informações, guias e páginas sem produtos.

### Tipos sob medida
Quando selecionar um configurador, a página serve como item administrável do menu.

Você pode editar:
- Nome da página
- Slug
- Imagem de capa
- Grupo do menu
- Ordem no menu

Mas o clique direciona automaticamente para o configurador correto.

Mapeamento atual:
- Cortina Wave sob medida → `index.html#configurador`
- Cortina Prega Macho sob medida → `configurador.html?id=prega-macho`
- Cortina de Ilhós sob medida → `configurador.html?id=cortina-varao`
- Persiana sob medida → `configurador.html?id=persiana`

## Vantagem
Você não precisa configurar URLs manualmente. Basta escolher o tipo da página.

## Banco
Nenhuma coluna nova é necessária nesta atualização.
O campo `page_type` já existente guarda o tipo selecionado.
