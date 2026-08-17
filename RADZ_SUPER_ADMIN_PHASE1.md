# RADZ HUB — Super Admin Fase 1

Data: 2026-08-17

## Objetivo desta fase

Evoluir `/radz-admin/` sem recriar os módulos que já existem e sem alterar o funcionamento das lojas atuais. Esta fase concentra-se em:

- empresas;
- planos;
- limites;
- recursos/feature flags;
- segurança do Super Admin;
- base de entitlements multiempresa.

As fases seguintes permanecem separadas para reduzir risco de regressão.

## Base existente reaproveitada

A implementação reutiliza as estruturas já existentes:

- `platform_companies` para cadastro central das empresas;
- `platform_users` para usuários da plataforma e das empresas;
- `platform_sessions` para sessões persistidas;
- `platform_domains` para domínios;
- `platform_features` como compatibilidade temporária das liberações já cadastradas por empresa;
- `platform_audit_logs` para auditoria central;
- `platform_company_stores` para mapear `company_id` à loja existente (`store_id`);
- tabelas da loja (`products`, `categories`, `orders`, `coupons`, `store_configs`, `admin_logs`) permanecem por `store_id` e não foram recriadas.

A arquitetura atual do R2 também é preservada. Uploads da loja já utilizam prefixo por empresa e loja:

`companies/{company_id}/stores/{store_id}/...`

Nenhum objeto R2 é movido, renomeado ou excluído nesta fase.

## Migration

Arquivo:

`database/migrations/20260817_radz_super_admin_phase1.sql`

A migration é aditiva e pressupõe que a base multiempresa existente (`radzhub_saas_v1.sql`) já tenha sido aplicada no banco alvo.

Novas estruturas:

- `platform_company_profile`
- `platform_plans`
- `platform_plan_limits`
- `platform_feature_catalog`
- `platform_plan_features`
- `platform_company_limit_overrides`
- `platform_company_feature_overrides`
- `platform_settings`
- `platform_auth_attempts`

A migration não contém `DROP TABLE`, `DROP COLUMN` nem exclusões dos dados operacionais existentes. Os planos já utilizados em `platform_companies.plan_code` são importados automaticamente para `platform_plans`.

## Empresas

`platform_companies` continua sendo a fonte principal da identidade da empresa. Campos novos que não exigem reconstrução da tabela existente ficam em `platform_company_profile`:

- WhatsApp;
- endereço;
- logo/favicon como referência de objeto;
- término de teste;
- vencimento;
- bloqueio administrativo;
- `deleted_at` para lixeira;
- última atividade.

O status `Bloqueada` é implementado por `access_blocked=1` para não reconstruir o CHECK constraint da tabela antiga em uma migration arriscada.

Exclusão definitiva de empresas não foi implementada. A ação padrão é soft delete.

## Planos e limites

Planos deixam de depender de valores fixos no frontend. O Super Admin pode armazenar plano, preço, periodicidade, ativação, limites e recursos no D1.

Limites iniciais suportados:

- `products_max`
- `listings_daily`
- `listings_monthly`
- `ai_daily`
- `ai_monthly`
- `ai_image_analysis`
- `ai_description`
- `ai_commands`
- `bulk_max_per_job`
- `users_max`
- `storage_bytes`

Exceções por empresa usam três modos:

- `add`: acrescenta ao limite do plano;
- `set`: substitui temporariamente o limite;
- `cap`: impõe um teto menor.

Exceções podem ter início e expiração sem alterar o plano global.

## Recursos / Feature flags

Prioridade adotada:

`bloqueio global > configuração específica da empresa > configuração do plano`

Enquanto um plano ainda não possuir uma regra explícita para um recurso existente, o resolver mantém compatibilidade com `platform_features` da empresa. Assim, a migration não desliga silenciosamente funcionalidades já utilizadas pelas lojas.

Quando o plano recebe uma regra explícita, inclusive `enabled=0`, a regra do plano passa a prevalecer (salvo override da empresa e bloqueio global).

## Aplicação real dos limites

Esta fase não se limita ao painel. O endpoint existente de criação de produtos da empresa foi conectado aos entitlements:

- valida a feature `catalog` no backend;
- resolve `company_id` pela sessão/tenant, não pelo navegador;
- calcula `products_max` pelo plano + exceções;
- impede criação acima do limite;
- mantém a query e gravação vinculadas ao `store_id` da sessão;
- registra auditoria central além do log administrativo já existente.

Outros módulos serão ligados ao mesmo resolver nas fases em que forem implementados.

## Segurança do RADZ Admin

O Super Admin passa a aceitar usuários individuais armazenados em `platform_users` com `company_id IS NULL` e papéis:

- `platform_owner` — Super Admin, com escrita;
- `platform_support` — suporte, leitura nesta fase.

Senhas reutilizam PBKDF2-SHA-256 já adotado pela plataforma. Sessões individuais são armazenadas em `platform_sessions`, com token aleatório armazenado somente por hash, cookie HttpOnly/Secure/SameSite e proteção CSRF.

Há rate limiting persistente de tentativas de login via `platform_auth_attempts`.

A chave `RADZ_ADMIN_TOKEN` foi mantida apenas como fallback temporário para permitir o provisionamento do primeiro usuário individual. Ela não é a arquitetura final.

## Bloqueio e suspensão

A autenticação do painel da empresa passou a verificar no backend:

- `platform_companies.status`;
- `platform_company_profile.access_blocked`;
- `platform_company_profile.deleted_at`.

Empresas suspensas, canceladas, bloqueadas ou em lixeira não podem manter acesso administrativo normal apenas manipulando o frontend.

## Dashboard

O Dashboard da Fase 1 exibe dados persistidos disponíveis de forma confiável:

- empresas por status;
- empresas por plano;
- produtos;
- pedidos no período;
- usuários;
- domínios com falha/pendentes;
- cobrança existente;
- auditoria recente.

IA, anúncios e armazenamento R2 aparecem como **não medidos** até que exista ledger persistente. O painel não fabrica estimativas a partir do frontend.

## R2

Não houve migration física ou alteração de objetos R2 nesta fase.

O modelo existente de prefixo por empresa/loja é preservado. O futuro controle de armazenamento deverá adicionar metadados/referências e medição de bytes antes de impor `storage_bytes` nos uploads.

A exclusão segura, deduplicação, lixeira de arquivos, órfãos e integridade D1 ↔ R2 permanecem para fase posterior, antes de qualquer limpeza física.

## Rollback

Como a migration é aditiva, o rollback recomendado desta fase é:

1. reverter o código para a branch anterior;
2. deixar as tabelas novas sem uso no D1;
3. não executar `DROP` em produção durante rollback emergencial;
4. somente remover estruturas em migration futura depois de confirmar que não há referências.

Nenhum rollback precisa apagar objetos R2 porque esta fase não altera fisicamente o bucket.

## Testes automatizados estáticos

Workflow:

`.github/workflows/radz-super-admin-phase1-check.yml`

Valida:

- sintaxe JavaScript dos arquivos alterados;
- aplicação da migration sobre o schema atual em SQLite;
- ausência de comandos destrutivos críticos;
- preservação da quantidade de empresas;
- criação das novas tabelas;
- importação do plano Founder e perfil da Salvatex;
- seed de recursos;
- idempotência da migration;
- cenário de compatibilidade em que uma regra explícita `enabled=0` no plano não pode ser substituída pelo valor legado da empresa.

## Testes obrigatórios antes de produção

A Fase 1 ainda precisa ser validada no D1 de Preview já separado da produção. Usar somente empresas fictícias de teste.

Matriz mínima:

1. aplicar a migration no D1 de teste e validar schema/índices;
2. provisionar um `platform_owner` e um `platform_support` fictícios;
3. testar login, logout, expiração, CSRF e rate limit;
4. validar que suporte não altera empresas/planos/limites/recursos;
5. criar/editar/duplicar plano e conferir leitura posterior;
6. aplicar limite por plano e exceção `add`, `set` e `cap`;
7. testar expiração de exceção;
8. bloquear recurso global, liberar/bloquear por empresa e validar prioridade;
9. testar `products_max` nas duas empresas fictícias sem cruzamento;
10. suspender/bloquear uma empresa e confirmar acesso negado somente a ela;
11. mover empresa fictícia para lixeira e restaurar;
12. confirmar auditoria das ações críticas;
13. executar novamente a matriz multiempresa de leitura/escrita para garantir ausência de vazamento;
14. confirmar que nenhum objeto do R2 de produção foi criado, alterado ou excluído pelo teste.

## Fases seguintes

### Fase 2

- categorias globais/opcionais por empresa;
- atributos dinâmicos e valores;
- vínculos categoria ↔ atributo;
- estrutura genérica de produtos/variações sem colunas por característica.

### Fase 3

- central de IA;
- configurações de IA por empresa;
- ledger de consumo idempotente (`operation_id`);
- anúncios e operações em massa;
- contadores diários/mensais confiáveis.

### Fase 4

- provedores de pagamento;
- fretes;
- domínios avançados;
- catálogo/versionamento de layouts.

### Fase 5

- RBAC granular da empresa;
- impersonação/sessão de suporte;
- auditoria antes/depois ampliada;
- lixeira avançada;
- metadados R2, referências, uso, órfãos e integridade D1/R2.

## Estado desta branch

Branch: `radz-super-admin-phase1`

Não aplicar em produção enquanto:

- CI não estiver verde;
- migration não tiver sido validada no D1 de Preview;
- matriz de duas empresas fictícias não estiver concluída;
- regressões das lojas atuais não tiverem sido verificadas.
