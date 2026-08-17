# Arquitetura unificada RADZ HUB

## Aplicações

- `/platform/`: site público e cadastro da RADZ HUB.
- `/radz-admin/`: administração central da plataforma.
- `/platform-admin/`: painel de cada empresa autenticada.
- Loja pública: mesma aplicação para todas as empresas; o domínio determina a empresa.

Branches servem somente para desenvolvimento e revisão. Produção usa uma versão validada da base única.

## Identidade e autorização

Cada requisição resolve `hostname -> platform_domains.company_id -> platform_company_stores.store_id`.
Nenhuma API aceita `company_id` ou `store_id` informado pelo navegador como fonte de autoridade.
Consultas de catálogo, clientes, pedidos, páginas, configurações e arquivos sempre filtram pelo `store_id` da sessão ou do domínio.

Papéis:
- `platform_owner`: proprietário da RADZ HUB.
- `platform_support`: suporte com ações auditadas.
- `owner`: proprietário da empresa.
- `manager`: gestor da loja.
- `staff`: operador limitado.
- cliente final: apenas a própria conta e seus pedidos.

## Dados e arquivos

D1 e R2 podem ser compartilhados. O isolamento é lógico e obrigatório:
- D1: `company_id` ou `store_id` em toda entidade pertencente a uma empresa.
- R2: prefixo privado `companies/{company_id}/stores/{store_id}/...`.
- Downloads passam por endpoint autenticado e autorizado.
- IDs públicos são aleatórios; nunca substituem autorização.

## Domínios

- `radzhub.com.br`: plataforma.
- Cada empresa recebe subdomínio provisório e pode conectar domínio próprio.
- Endereços de Preview não aparecem na interface.
- Ativação depende de verificação DNS e HTTPS.

## Migração da Salvatex

1. Manter `store_id=salvatex` e associação existente em `platform_company_stores`.
2. Substituir gradualmente valores fixos no código pelo contexto resolvido.
3. Executar testes de isolamento com duas empresas.
4. Publicar em Preview e validar.
5. Trocar produção somente após aprovação dos testes.
