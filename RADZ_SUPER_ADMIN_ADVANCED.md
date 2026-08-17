# RADZ HUB — Super Admin avançado

Data: 2026-08-17

Este documento registra o avanço das Fases 2 a 5 sobre a base segura da Fase 1. Nenhuma migration descrita aqui foi aplicada no D1 de produção.

## O que foi preparado

### Categorias globais e por empresa

Nova tabela `platform_categories`:

- `company_id IS NULL` = categoria global;
- `company_id=<empresa>` = categoria exclusiva;
- slug único por escopo;
- hierarquia opcional por `parent_id`;
- ordenação, ativação, regras JSON e `deleted_at`.

A árvore global não obriga as empresas a usar a mesma estrutura.

### Atributos dinâmicos

Estruturas:

- `platform_attributes`;
- `platform_attribute_values`;
- `platform_category_attributes`.

Tipos suportados:

- text;
- number;
- select;
- multiselect;
- boolean;
- color;
- range;
- unit.

Nenhuma característica nova exige uma coluna fixa em `products`.

### IA

`platform_ai_settings` separa configuração global de configuração por empresa. O D1 armazena somente configuração não secreta: provedor, modelo, prompt, idioma, tom, timeout, temperatura, padrões e instruções.

API keys, tokens e outros secrets continuam obrigatoriamente fora do frontend e fora dessa tabela.

### Consumo e idempotência

`platform_usage_events` registra:

- `company_id`;
- `usage_type`;
- `quantity`;
- `operation_id`;
- entidade relacionada;
- metadados;
- data.

Existe unicidade por `(company_id, usage_type, operation_id)`, impedindo dupla contabilização da mesma operação.

`platform_generation_jobs` prepara operações em massa com estados:

- pending;
- processing;
- completed;
- completed_with_errors;
- failed;
- cancelled.

Os contadores solicitados/processados/criados/ignorados/com erro são persistidos.

### Layouts

`platform_layout_templates` permite templates versionados sem construtor visual complexo. `platform_layout_access` prepara liberação por plano ou empresa.

### Pagamentos e fretes

Separação entre catálogo global e habilitação por empresa:

- `platform_payment_providers`;
- `platform_company_payment_providers`;
- `platform_shipping_methods`;
- `platform_company_shipping_methods`.

Secrets de gateway não devem ser gravados como valor puro; a estrutura guarda apenas referências a bindings/secrets.

### Permissões

Estruturas:

- `platform_roles`;
- `platform_permissions`;
- `platform_role_permissions`.

Papéis iniciais:

- Super Admin;
- Suporte;
- Financeiro;
- Administrador da empresa;
- Gerente;
- Cadastro;
- Vendas;
- Atendimento.

A estrutura foi criada no backend; a migração gradual dos papéis antigos `owner/manager/staff` deve preservar compatibilidade até que todas as rotas usem RBAC detalhado.

### Suporte / impersonação

`platform_support_sessions` está criada para registrar ator, empresa, motivo, expiração, status e encerramento.

A entrada real no painel da empresa ainda não foi ligada porque o requisito é registrar de forma confiável todas as alterações realizadas durante o suporte. Não será ativada parcialmente apenas para fazer a interface aparecer.

### R2 e mídia

`platform_media_objects` passa a ser o catálogo de metadados do R2. Nenhum objeto atual é movido por esta migration.

Campos principais:

- company_id;
- store_id;
- object_key globalmente único;
- nome original;
- MIME;
- tamanho;
- dimensões;
- checksum;
- visibilidade;
- status;
- lixeira/purge.

`platform_media_references` permite uma mídia ser reutilizada por vários produtos/variações/atributos sem cópia física.

A regra futura de exclusão é:

1. remover referência no D1;
2. verificar referências restantes;
3. marcar mídia como lixeira;
4. aguardar período de retenção;
5. apagar R2 somente quando não houver referências;
6. auditar.

### Integridade D1 ↔ R2

`platform_integrity_incidents` registra problemas como:

- objeto R2 sem registro D1;
- registro D1 sem objeto R2;
- upload incompleto;
- falha de compensação;
- inconsistência de domínio/integração.

Nenhuma limpeza automática destrutiva foi criada.

## API

`functions/radz/api/advanced.js` oferece controle autenticado para a Central Avançada. Escritas exigem `platform_owner`, sessão válida e CSRF.

Operações já implementadas no código:

- criar/editar/soft-delete/restaurar categoria;
- criar/editar/soft-delete/restaurar atributo;
- adicionar valor de atributo;
- vincular atributo a categoria;
- salvar IA global ou por empresa;
- registrar consumo idempotente;
- criar template de layout;
- configurar provedor de pagamento por empresa sem expor secret;
- configurar método de frete por empresa;
- resolver incidente de integridade.

## Interface

`radz-admin/radz-admin-advanced.js` adiciona a **Central Avançada** sem reescrever o painel existente. Ela inclui:

- visão avançada;
- categorias e atributos;
- IA;
- consumo;
- layouts e serviços;
- permissões;
- R2 e integridade.

Se a migration ainda não existir no D1, a interface mostra `MIGRATION_REQUIRED` e não tenta operar em tabelas ausentes.

## Testes automatizados

`.github/workflows/radz-super-admin-advanced-check.yml` valida:

- sintaxe dos novos arquivos JS;
- migrations aditivas;
- ausência de comandos destrutivos críticos;
- preservação das empresas existentes;
- criação das tabelas avançadas;
- slug de categoria isolado por empresa;
- idempotência de `operation_id`;
- unicidade global de `object_key`;
- reaplicação segura da migration.

O workflow está verde no GitHub.

## Pendências que exigem Cloudflare/Preview

Antes de produção ainda é obrigatório:

1. aplicar Fase 1 no D1 exclusivo de Preview;
2. aplicar `20260817_radz_super_admin_phase2_5.sql` no mesmo D1 de Preview;
3. executar duas empresas fictícias;
4. testar isolamento autenticado em todas as novas APIs;
5. validar bindings R2 sem tocar no bucket de produção;
6. validar consumo/limites e falhas parciais;
7. somente então ativar impersonação real;
8. somente depois integrar metadados R2 aos uploads existentes;
9. nunca mover/apagar objetos atuais apenas para adaptar a arquitetura.

## Rollback

Como as migrations são aditivas, o rollback emergencial recomendado continua sendo reverter o código e deixar as novas tabelas sem uso. Não executar DROP em produção como primeira estratégia de rollback.
