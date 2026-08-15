# Salvatex — Security Hardening (pré-produção)

Data: 2026-08-14. Escopo: 81 arquivos JavaScript, Pages Functions/APIs, frontend, Admin, D1, R2 e integrações Meta/Google do pacote final recebido.

## Resultado executivo

O pacote foi endurecido para reduzir riscos de XSS, SQL injection, IDOR, CSRF, sequestro de sessão, exposição de documentos, uploads abusivos, open redirect, secrets no navegador e vazamento por logs/integrações. Isto é uma revisão defensiva e não uma garantia de segurança total. Testes externos, configuração correta da conta Cloudflare e monitoramento contínuo continuam necessários.

## Implementado

- Admin: o `ADMIN_TOKEN` não é mais guardado em `localStorage`/`sessionStorage` nem enviado em todas as APIs. O login troca a chave por cookie `__Host-` assinado com HMAC, `HttpOnly`, `Secure`, `SameSite=Strict`, duração de 8 horas e nonce. Operações mutáveis exigem token CSRF e validação de Origin. Comparações de segredo usam Web Crypto em tempo constante.
- Cliente: sessão Google assinada no servidor, cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`, duração reduzida para 12 horas e nonce. Assinatura, `iss`, `aud`, `exp` e e-mail verificado continuam validados no servidor; o `sub` permanece como identidade Google.
- Autorização: pedidos, histórico, rastreio e documentos de conta são filtrados pelo e-mail verificado da sessão. Um pedido já existente não pode ser sobrescrito por uma sessão anônima ou por outro cliente. IDs de pedidos e itens usam UUID criptográfico.
- R2: `/media/*` só atende chaves `configuradores/*` e rejeita `private/*`. NF/XML ficam em `private/orders/<uuid>/...` e só saem por endpoint que valida Admin ou proprietário do pedido. Respostas privadas usam `no-store` e download como anexo.
- Upload: Admin obrigatório, CSRF, UUID no nome do objeto, limites de tamanho, lista de MIME/extensões e correspondência entre MIME/extensão. Exclusão pública é limitada ao prefixo de configuradores e não alcança documentos privados.
- Entradas/D1: queries usam parâmetros D1; texto recebe limites e remoção de controles; e-mail é validado; estados internos do pedido e observações internas enviados pelo checkout são ignorados; páginas HTML editáveis removem tags/atributos executáveis; slugs e IDs são limitados.
- OAuth: `state` único e expirável; redirects permanecem same-origin ou em variável explícita. Access/refresh tokens Meta/Google deixaram de ser persistidos no D1. O D1 conserva apenas metadados não secretos da conexão. Tokens operacionais devem ser secrets do Cloudflare.
- Headers: CSP compatível com Google Identity, GTM/GA4/Ads e Meta Pixel, HSTS, `nosniff`, `DENY`, Referrer Policy, Permissions Policy, COOP e `no-store` no Admin/API.
- Marketing: Meta CAPI usa apenas secret server-side. O endpoint não aceita mais e-mail/telefone arbitrários do navegador e limita nomes/parâmetros de eventos, reduzindo envio indevido de PII.
- Antiabuso: integração server-side de Turnstile preparada e desativada por padrão para não quebrar o site. Pedidos passam a exigir Siteverify quando `TURNSTILE_ENFORCE=true`. Regras de rate limiting/WAF são descritas no guia Cloudflare.
- Logs: erros OAuth não registram tokens/respostas; logs administrativos registram ações e metadados mínimos. Secrets não foram adicionados ao código.

## Pontos revisados

- Todas as rotas `functions/admin/api/**` exigem a nova sessão, exceto login e callbacks OAuth protegidos por `state`.
- Rotas públicas de catálogo/configuradores/layout expõem apenas dados de publicação.
- Rotas de conta exigem sessão e autorização por proprietário.
- SQL dinâmico encontrado usa statements fixos e `.bind()`; não foram encontrados valores do usuário interpolados como SQL.
- URLs de documentos não são URLs públicas do bucket.

## Limitações e riscos residuais

- O checkout ainda recebe a composição e os valores calculados pelo configurador no navegador. O servidor verifica consistência aritmética, mas a regra comercial completa deve futuramente ser recalculada server-side antes de cobrança automática. Até isso ocorrer, trate o pedido como orçamento/`aguardando_pagamento` e valide o valor antes de capturar pagamento.
- A sanitização de HTML é defensiva, mas não substitui um sanitizador HTML formal com parser/allowlist. A CSP reduz impacto; recomenda-se migrar o editor para blocos estruturados ou DOMPurify server-compatible.
- Rate limiting robusto depende de WAF/Rate Limiting Rules, não de memória global do Worker. Precisa ser configurado manualmente.
- Turnstile foi preparado no endpoint de pedido, mas o widget/token deve ser ligado ao frontend antes de ativar `TURNSTILE_ENFORCE`.
- OAuth avançado de gestão de campanhas requer armazenamento/rotação de credenciais em Secrets/Secrets Store. A versão endurecida não persiste refresh/access tokens no D1 e, portanto, apenas registra o vínculo da conta.
- Não houve pentest externo, SAST/DAST comercial, teste com D1/R2 reais ou deploy de produção nesta revisão local.
- CSP ainda permite `'unsafe-inline'` para compatibilidade com o frontend legado. Remover isso exige migrar scripts/estilos inline para arquivos ou nonces.

## LGPD e retenção recomendada

- Defina base legal e finalidade para pedido, entrega, NF, analytics e marketing; registre consentimento de cookies não essenciais antes de Pixel/Ads/GA4/GTM.
- Minimize coleta; não envie CPF, endereço, e-mail, telefone, NF/XML ou conteúdo de pedido a pixels/tags.
- Sugestão inicial, sujeita a validação jurídica/contábil: carrinhos e tentativas não concluídas 30–90 dias; logs técnicos sem PII 30–90 dias; sessões 8/12 horas; dados de marketing conforme consentimento; pedidos e documentos fiscais pelo prazo legal aplicável no Brasil.
- Implemente processo para acesso, correção, portabilidade, oposição e exclusão quando legalmente possível; documente operadores e transferências internacionais.
- Restrinja suporte/funcionários por menor privilégio e registre acesso administrativo. Faça revisão jurídica antes da produção.

## Validações locais

- 81 arquivos JavaScript passaram em verificação de sintaxe.
- Imports relativos e referências locais foram verificados no empacotamento final.
- ZIPs foram reabertos para teste de integridade.

