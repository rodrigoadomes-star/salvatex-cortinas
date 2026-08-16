# MULTITENANT_TEST_REPORT

Data: 2026-08-16

## Escopo

Validação da arquitetura multiempresa da branch `radz-hub-arquitetura-unificada` em ambiente Cloudflare Pages Preview, sem alterar o banco D1 de produção.

## Ambiente isolado

- Pages project: `radz-hub`
- Ambiente: Preview
- D1 de teste: `radz-hub-multitenant-test`
- UUID: `1233d3ac-0623-4827-87ab-243462e85e5b`
- D1 de produção permaneceu inalterado: `1c0eb544-c194-4221-9819-a747e7be3316`

## Empresas fictícias

1. Salvatex Teste
   - Loja: `test-salvatex`
   - Produto: Cortina Fictícia Salvatex
   - Cliente e pedido usam endereços `example.invalid`
2. Aurora Casa Teste
   - Loja: `test-aurora`
   - Produto: Almofada Fictícia Aurora
   - Cliente e pedido usam endereços `example.invalid`

Nenhum dado pessoal real foi inserido no banco de teste.

## Resultado funcional

O endpoint público `/api/catalog` foi executado duas vezes no mesmo deployment, mudando apenas a empresa associada ao hostname de teste:

- Tenant Salvatex Teste: retornou apenas `Cortina Fictícia Salvatex`.
- Tenant Aurora Casa Teste: retornou apenas `Almofada Fictícia Aurora`.
- Nenhum produto da outra empresa apareceu em qualquer resposta.

## Verificações de integridade

Todas retornaram zero falhas:

- produto relacionado a categoria de outra loja;
- pedido relacionado a conta sem vínculo com a mesma loja;
- empresa sem loja associada;
- domínio ativo sem empresa associada.

## Segurança observada

- Respostas incluem `Cache-Control: no-store`.
- CSP, HSTS, proteção contra framing, `nosniff`, política de referência e política de permissões estão ativas.
- O painel administrativo do Preview não recebeu credenciais de produção.
- A tentativa sem configuração administrativa foi bloqueada com resposta controlada.

## Implementação posterior ao primeiro teste

A branch passou a conter a primeira versão da autenticação administrativa individual por empresa:

- o login do painel usa `platform_users` com e-mail e senha em vez de uma chave administrativa compartilhada;
- a conta precisa estar vinculada à mesma `company_id` resolvida pelo domínio;
- somente os papéis `owner`, `manager` e `staff` podem abrir o painel da loja;
- a sessão administrativa é assinada, protegida por CSRF e também registrada em `platform_sessions`;
- cada requisição autenticada compara usuário, sessão e empresa com o tenant resolvido pelo hostname;
- logout revoga a sessão persistida;
- o painel passa a exibir a identidade do usuário autenticado.

Esta implementação ainda NÃO foi validada contra o D1 de Preview com contas reais de teste. Nenhuma conclusão de segurança adicional deve ser tirada até concluir a matriz autenticada abaixo.

## Limitações

- Este teste não prova ausência total de vulnerabilidades.
- Ainda faltam criar contas administrativas individuais no D1 de teste e executar login real para Salvatex Teste e Aurora Casa Teste.
- Ainda faltam testes autenticados de acesso cruzado entre as duas empresas.
- Ainda faltam testes de escrita/edição/exclusão para cada módulo e ensaios de concorrência.
- A diferenciação fina de permissões entre `owner`, `manager` e `staff` ainda precisa ser validada/implementada por operação; nesta etapa os três papéis são aceitos pelo painel da própria empresa.
- O R2 de Preview continua com o binding existente; uploads de teste não foram executados para evitar mistura de objetos. A separação física/lógica de mídia deverá ser validada antes da produção.
- A migração de produção não foi executada.

## Próxima etapa segura

1. Criar duas contas administrativas fictícias no D1 de teste, uma por empresa, sem reutilizar credenciais de produção.
2. Validar login, logout, expiração e CSRF no Pages Preview.
3. Tentar deliberadamente usar a sessão da Salvatex Teste contra o tenant Aurora e vice-versa; o esperado é `403` sem leitura ou escrita.
4. Criar bucket R2 exclusivo de teste ou política de prefixos verificada.
5. Executar matriz autenticada de leitura, criação, edição e exclusão por módulo.
6. Revisar regressões e permissões por papel.
7. Somente após aprovação, planejar migração gradual da produção com backup e rollback.
