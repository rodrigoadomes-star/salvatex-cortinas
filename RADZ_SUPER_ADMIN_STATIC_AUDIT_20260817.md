# RADZ Super Admin — auditoria estática 2026-08-17

## Escopo validado sem Cloudflare real

- autenticação individual do RADZ Admin e fallback temporário por chave mestra;
- sessão HttpOnly, CSRF, expiração e revogação;
- rate limit de login;
- resolução de tenant do Admin da Empresa pelo backend;
- validação `company_id` ↔ domínio/tenant ↔ sessão;
- isolamento por `store_id` nas rotas críticas de pedidos e catálogo revisadas;
- planos, limites e feature flags;
- exceções de limite por empresa;
- categorias/atributos globais e por empresa;
- consumo por `operation_id`;
- criação de produto com reserva idempotente em batch quando o ledger está disponível;
- upload R2 com prefixo por empresa/loja;
- compensação de R2 quando metadados D1 falham;
- bloqueio explícito de `object_key` pertencente a outro tenant/loja;
- exclusão lógica de produtos e categorias usando `active=0` no Admin da Empresa;
- estrutura de lixeira de mídia e referências reutilizáveis;
- estruturas de IA, layouts, pagamentos, fretes, RBAC e suporte/impersonação;
- migrations verificadas como aditivas pelos workflows.

## Correções realizadas nesta auditoria

1. **R2 / D1 cross-tenant**
   - `registerPlatformMedia` rejeita key com prefixo de outra empresa;
   - rejeita key de outra loja;
   - rejeita reutilização de registro D1 pertencente a outro tenant.

2. **Compensação de upload**
   - se R2 salvar e o D1 avançado estiver ativo mas o registro de metadados falhar, o objeto recém-enviado é removido como compensação;
   - `migration_pending` mantém somente o caminho de compatibilidade temporário.

3. **Idempotência de criação de produto**
   - `platform_usage_events` passa a reservar `operation_id` no mesmo `DB.batch()` do INSERT do produto;
   - duas requisições com o mesmo `operation_id` não devem criar dois produtos quando a migration avançada está ativa;
   - repetição retorna o `entity_id` já associado à operação.

4. **Soft delete operacional**
   - DELETE de produto passa a `active=0`;
   - DELETE de categoria passa a `active=0`;
   - restauração pode ocorrer pelo update normal reativando o registro;
   - não há mais exclusão física nessas duas rotas.

## CI

Os workflows da branch validam:

- sintaxe JavaScript;
- ausência de statements destrutivos nas migrations principais;
- criação das tabelas esperadas;
- compatibilidade com dados existentes;
- duas empresas utilizando valores iguais sem colisão cross-tenant;
- unicidade dentro da mesma empresa;
- idempotência por `operation_id`;
- isolamento de `object_key` R2;
- configuração global única de IA;
- proteção cross-tenant de mídia;
- criação de produto usando batch idempotente;
- ausência de `DELETE FROM products` e `DELETE FROM categories` nas rotas administrativas.

## Pontos que NÃO podem ser aprovados apenas por análise estática

Estes itens permanecem bloqueados até acesso operacional ao Cloudflare Preview:

1. aplicar `20260817_radz_super_admin_phase1.sql` no D1 Preview;
2. aplicar `20260817_radz_super_admin_phase2_5.sql` no D1 Preview;
3. criar Super Admin individual no D1 Preview;
4. validar login real por e-mail/senha e revogação de sessão;
5. criar duas empresas fictícias e executar matriz autenticada A ↔ B;
6. validar upload real no R2 Preview;
7. validar limite de armazenamento real;
8. testar R2 salva / D1 falha;
9. testar D1 disponível / R2 falha;
10. validar lixeira e referências reais;
11. validar objetos antigos sem metadados e estratégia de backfill;
12. habilitar e testar impersonação apenas após auditoria real das ações;
13. validar o Preview do configurador contra a referência de mídia do commit `7dda575`;
14. validar o domínio de produção separado do Preview;
15. somente depois considerar merge/publicação.

## Regra de publicação

O PR deve permanecer em **draft** até a matriz acima ser concluída. Nenhuma migration de produção, merge, movimentação/exclusão física em R2 ou ativação de impersonação deve ocorrer antes dessa validação.
