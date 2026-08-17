# RADZ Super Admin — auditoria estática 2026-08-17

## Escopo validado sem Cloudflare real

- autenticação individual do RADZ Admin e fallback temporário por chave mestra;
- sessão HttpOnly, CSRF, expiração e revogação;
- rate limit de login;
- resolução de tenant do Admin da Empresa pelo backend;
- validação `company_id` ↔ domínio/tenant ↔ sessão;
- isolamento por `store_id` nas rotas críticas de pedidos, catálogo e mídia revisadas;
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
- RBAC aditivo com `platform_user_roles`, sem reconstruir `platform_users`;
- permissões no backend para produtos, categorias, pedidos, mídia e financeiro da empresa;
- papéis RADZ Super Admin, Suporte e Financeiro com papéis efetivos resolvidos na sessão;
- endpoint seguro `/radz/api/readiness` para diagnosticar migrations/bindings sem expor secrets;
- estruturas de IA, layouts, pagamentos, fretes e suporte/impersonação;
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
   - `platform_usage_events` reserva `operation_id` no mesmo `DB.batch()` do INSERT do produto;
   - requisições repetidas com a mesma operação não devem criar dois produtos quando a migration avançada está ativa;
   - repetição retorna o `entity_id` já associado.

4. **Soft delete operacional**
   - DELETE de produto passa a `active=0`;
   - DELETE de categoria passa a `active=0`;
   - restauração pode ocorrer pelo update normal reativando o registro;
   - não há mais exclusão física nessas duas rotas.

5. **RBAC sem migration destrutiva**
   - criado `platform_user_roles` para permitir múltiplos papéis sem alterar o CHECK legado de `platform_users.role`;
   - backfill só ocorre para usuários ainda sem atribuição explícita;
   - `owner → company_admin`, `manager → company_manager`, `staff → company_support`;
   - Super Admin, Suporte e Financeiro passam a possuir atribuições separadas;
   - rotas críticas do Admin da Empresa verificam permissão no backend, não no frontend.

6. **Menor privilégio no RADZ Admin**
   - o acesso padrão de `requireRadzAdmin` fica restrito a Super Admin e Suporte;
   - Financeiro deve ser explicitamente autorizado por rota/permissão;
   - login e sessão retornam os papéis efetivos, não apenas o papel legado usado para compatibilidade.

## CI

Os workflows da branch validam sintaxe JavaScript, migrations aditivas, ausência de `DROP` destrutivo, compatibilidade com dados existentes, isolamento entre empresas, idempotência por `operation_id`, proteção de `object_key` R2, configuração global única de IA, batch idempotente de produto, soft delete de catálogo e invariantes de RBAC. As últimas execuções após as alterações estruturais estão verdes.

## Pontos que NÃO podem ser aprovados apenas por análise estática

Estes itens permanecem bloqueados até acesso operacional ao Cloudflare Preview:

1. aplicar `20260817_radz_super_admin_phase1.sql` no D1 Preview;
2. aplicar `20260817_radz_super_admin_phase2_5.sql` no D1 Preview;
3. aplicar `20260817_radz_rbac_assignments.sql` no D1 Preview;
4. consultar `/radz/api/readiness` no runtime Preview;
5. criar Super Admin individual no D1 Preview;
6. validar login real por e-mail/senha, Financeiro, Suporte e revogação de sessão;
7. criar duas empresas fictícias e executar matriz autenticada A ↔ B;
8. validar upload real no R2 Preview;
9. validar limite de armazenamento real;
10. testar R2 salva / D1 falha e D1 disponível / R2 falha;
11. validar lixeira e referências reais;
12. validar objetos antigos sem metadados e estratégia de backfill;
13. habilitar e testar impersonação apenas após auditoria real das ações;
14. validar o Preview do configurador contra a referência de mídia do commit `7dda575`;
15. validar o domínio de produção separado do Preview;
16. somente depois considerar merge/publicação.

## Regra de publicação

O PR deve permanecer em **draft** até a matriz acima ser concluída. Nenhuma migration de produção, merge, movimentação/exclusão física em R2 ou ativação de impersonação deve ocorrer antes dessa validação.
