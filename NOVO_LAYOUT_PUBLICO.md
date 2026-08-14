# Novo layout público — Opção 2

## Cabeçalho
O menu agora fica:

- Cortinas sob medida
- Persianas sob medida
- Contato
- Carrinho

Foram removidos do cabeçalho:
- Tecidos
- Produtos
- Como funciona
- Montar minha cortina

## Mega menu
Ao passar o mouse em **Cortinas sob medida**, abre um painel no estilo aprovado:

- páginas de cortinas sob medida com foto;
- bloco lateral de produtos/páginas de pronta entrega.

Ao passar em **Persianas sob medida**, aparecem as páginas de persianas.

## Administração
Em **Admin > Páginas**, cada página passa a ter:

- Nome da página;
- Onde exibir no menu;
- Ordem no menu;
- Produtos vinculados;
- Medidas;
- Imagem de capa.

Portanto, mudar o nome no Admin muda automaticamente o nome exibido no site.

## Organização sugerida
Crie/edite páginas e marque:

### Cortinas sob medida
- Cortina Wave
- Cortina Prega Macho
- Cortina de Ilhós

### Persianas sob medida
- Persiana Rolô / página de persianas que desejar

### Pronta entrega
- Cortina para Varão
- Cortina Wave pronta entrega

## Banco D1
Antes de usar o novo campo do menu, execute uma única vez:

`database/navigation_layout.sql`

Depois disso, edite as páginas existentes no Admin e selecione o grupo correto.

## Hero
A página inicial já recebeu o novo layout com foto de cortina ao fundo e acabamento visual inspirado no mockup aprovado.

O configurador Wave atual foi preservado mais abaixo na home para não perder nenhuma funcionalidade enquanto as páginas novas são cadastradas.
