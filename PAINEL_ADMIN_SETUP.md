# Painel Admin Salvatex — instalação

## 1. Banco D1
No Console do `salvatex-db`, execute o arquivo:

`database/migration_admin_v5.sql`

Ele adiciona: categorias, produtos, páginas, cupons, configurações da loja e logs administrativos. As tabelas de pedidos existentes são preservadas.

## 2. Chave de acesso do painel
Cloudflare Pages > `salvatex-cortinas` > Configurações > Variáveis e segredos > Adicionar.

Crie um **segredo** chamado exatamente:

`ADMIN_TOKEN`

Use uma senha/chave longa e aleatória. Não coloque essa chave no GitHub.

Depois faça uma nova implantação.

## 3. Acesso
Abra:

`https://salvatex-cortinas.pages.dev/admin/`

Informe a chave `ADMIN_TOKEN` na tela de login.

## 4. O que já funciona
- Dashboard com dados reais do D1
- Faturamento, pedidos, ticket médio, status e gráfico
- Pedidos e detalhes
- Alteração de status do pedido com histórico
- Clientes derivados dos pedidos
- Produtos (CRUD)
- Categorias (CRUD)
- Páginas (CRUD)
- Cupons (CRUD)
- Biblioteca de mídia baseada nas URLs dos produtos
- Relatórios iniciais
- Configuração central do configurador Wave salva no D1
- Integrações/status
- Plano e cobrança: 1% ou mínimo R$150
- Logs administrativos

## 5. Segurança
O painel não expõe os dados sem `ADMIN_TOKEN`. Para produção profissional, uma etapa posterior pode trocar esse login por Cloudflare Access/usuários individuais com permissões.

## 6. Observação sobre imagens
O cadastro de produto aceita URL de imagem. Upload de arquivos pelo painel deve ser conectado posteriormente ao Cloudflare R2 (ou serviço equivalente). Isso evita guardar imagens dentro do D1.
