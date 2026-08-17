# RADZ HUB como runtime principal

## Decisão arquitetural

A RADZ HUB passa a ser o projeto principal da plataforma. A Salvatex deixa de ser tratada como uma aplicação separada na arquitetura e passa a ser a primeira empresa/loja da RADZ HUB.

Durante a migração, o projeto Cloudflare `salvatex-cortinas` permanece ativo como fallback de produção. Ele só deve ser desativado depois que o runtime `radz-hub` reproduzir integralmente loja, admin, D1, R2, autenticação, Turnstile, Google e demais integrações usadas pela Salvatex.

## Branch de unificação

Branch preparada: `radz-unified-production`.

Autoridade por área:

- Plataforma, Super Admin, multiempresa, Meta Ads e Analytics: RADZ HUB.
- Loja Salvatex, configuradores, fotos, mídia e regras comerciais existentes: versão estável da Salvatex.
- Mudanças futuras devem nascer em branch curta e retornar à linha principal após teste.

## Bindings necessários no projeto `radz-hub`

- `DB` -> D1 principal da plataforma.
- `MEDIA` -> R2 principal de mídia.

Antes de trocar produção, ambos devem apontar para os recursos corretos e conter os dados/referências esperados pela Salvatex.

## Secrets/variáveis da RADZ HUB

Obrigatórios para a camada de plataforma:

- `RADZ_ADMIN_TOKEN` — secret.
- `RADZ_ADMIN_SESSION_SECRET` — secret.
- `META_APP_ID` — texto.
- `META_APP_SECRET` — secret.
- `META_GRAPH_VERSION` — texto.
- `META_OAUTH_REDIRECT_URI` — texto.
- `META_CREDENTIALS_KEY` — secret.

## Compatibilidade temporária da Salvatex dentro do runtime RADZ

Enquanto o painel antigo da Salvatex ainda existir, o projeto `radz-hub` também precisa das variáveis abaixo. Elas NÃO devem ser substituídas pelas credenciais de Super Admin, pois são níveis de privilégio distintos.

- `ADMIN_TOKEN` — secret da administração da loja.
- `ADMIN_SESSION_SECRET` — secret da sessão administrativa da loja.
- `CUSTOMER_SESSION_SECRET` — secret das sessões de clientes.
- `TURNSTILE_ENFORCE` — texto.
- `TURNSTILE_SECRET_KEY` — secret.
- `TURNSTILE_SITE_KEY` — texto.
- `GOOGLE_OAUTH_CLIENT_ID` — texto.
- `GOOGLE_OAUTH_CLIENT_SECRET` — secret.
- `GOOGLE_ADS_OAUTH_REDIRECT_URI` — texto.

## Variáveis que NÃO devem ser misturadas

`RADZ_ADMIN_TOKEN` e `ADMIN_TOKEN` têm finalidades diferentes.

`RADZ_ADMIN_SESSION_SECRET` e `ADMIN_SESSION_SECRET` também devem continuar independentes.

O Super Admin não deve reutilizar a chave da loja e a loja não deve reutilizar a chave do Super Admin.

## Meta Ads

A integração Meta passa a pertencer somente à plataforma RADZ HUB.

- App Secret fica no backend RADZ.
- Tokens são criptografados antes de ir ao D1.
- Credenciais são vinculadas por `company_id`.
- A Salvatex usa a integração Meta como qualquer outra empresa da plataforma.

Não é necessário manter uma segunda implementação Meta no projeto antigo da Salvatex após a migração definitiva.

## D1

O D1 principal deve conter tanto as estruturas antigas da Salvatex quanto as tabelas da plataforma RADZ durante a fase de compatibilidade.

Não mover ou apagar dados para unificar. Primeiro vincular os registros existentes à empresa Salvatex e manter compatibilidade.

Tabelas RADZ já adicionadas incluem analytics e integrações Meta. Toda leitura/escrita pertencente a empresa deve continuar validando `company_id` no backend.

## R2

O R2 principal deve preservar as mídias existentes.

A migração definitiva deve evoluir para object keys por empresa, por exemplo:

`companies/{company_id}/products/...`

Arquivos antigos não devem ser renomeados ou apagados apenas para encaixar no padrão novo. O D1 pode manter referências legadas até uma migração segura posterior.

## Verificação segura de ambiente

O endpoint autenticado abaixo foi preparado para verificar apenas presença/ausência de bindings e variáveis, sem revelar nenhum valor:

`/radz/api/health`

Ele deve ser usado no Super Admin antes da troca de produção.

## Ordem de migração para tornar RADZ a produção única

1. Validar `radz-unified-production` em Preview.
2. Confirmar configuradores, fotos e carregamento da Salvatex.
3. Confirmar login/admin da Salvatex.
4. Confirmar analytics.
5. Confirmar Meta Ads.
6. Confirmar D1 e R2.
7. Copiar para o projeto `radz-hub` apenas as variáveis legadas ainda necessárias da Salvatex.
8. Ajustar callbacks OAuth para os domínios finais.
9. Apontar os domínios da Salvatex para o runtime RADZ.
10. Manter o projeto antigo disponível como rollback por um período de segurança.
11. Somente depois remover configurações duplicadas que comprovadamente não são mais utilizadas.

## Regra de rollback

Os backups de branch criados em 17/08/2026 não devem ser apagados durante a migração. Se houver regressão, voltar o domínio/Production Branch para a versão estável anterior sem alterar D1 ou R2 de forma destrutiva.
