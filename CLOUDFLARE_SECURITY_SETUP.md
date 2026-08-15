# Configuração manual de segurança no Cloudflare

Faça estes passos antes de conectar dados/credenciais reais ou liberar produção.

## 1. Bindings

- D1: binding `DB` para a base Salvatex.
- R2: binding `MEDIA` para bucket privado. Desative domínio público e `r2.dev`; não crie regra pública para `private/*`.

## 2. Secrets (nunca Vars públicas)

Crie valores aleatórios fortes e diferentes para cada ambiente:

- `ADMIN_TOKEN`: senha/chave administrativa longa (mínimo recomendado: 32 bytes aleatórios).
- `ADMIN_SESSION_SECRET`: mínimo 32 bytes aleatórios, diferente do token.
- `CUSTOMER_SESSION_SECRET`: mínimo 32 bytes aleatórios, diferente dos anteriores.
- `GOOGLE_OAUTH_CLIENT_ID` (identificador público, pode ser Var, mas manter centralizado).
- `GOOGLE_OAUTH_CLIENT_SECRET`.
- `META_APP_ID` (identificador público).
- `META_APP_SECRET`.
- `META_CAPI_ACCESS_TOKEN`.
- `TURNSTILE_SECRET_KEY` quando ativar Turnstile.

Nunca coloque esses valores em HTML, JS, D1, ZIP, GitHub, `_headers` ou documentação. Rotacione imediatamente qualquer segredo que já tenha sido publicado.

## 3. Cloudflare Access para `/admin*`

Crie uma aplicação Self-hosted para `seudominio.com/admin*`. Permita somente identidades administrativas aprovadas, habilite MFA no provedor e negue o restante. O login interno do site continua como segunda camada. Proteja também URLs de preview/staging.

## 4. WAF e rate limiting

Ative Managed Rules e crie regras, começando em `Log/Challenge` para observar falsos positivos:

- `/admin/api/login`: aproximadamente 5 tentativas/minuto/IP e Managed Challenge após exceder.
- `/api/auth/google`: 10/minuto/IP.
- `/api/pedidos`: 5/minuto/IP.
- `/api/track`: 60/minuto/IP.
- uploads Admin: 10/minuto/identidade/IP.

Bloqueie métodos HTTP não esperados e monitore Security Events. Ajuste limites com tráfego real.

## 5. Turnstile

1. Crie widget para os hostnames de produção e staging.
2. Adicione a site key pública ao frontend do checkout e envie o token como `turnstileToken` no pedido.
3. Configure `TURNSTILE_SECRET_KEY` como secret.
4. Teste Siteverify em staging.
5. Somente depois defina `TURNSTILE_ENFORCE=true`.

Se ativar antes de o frontend enviar o token, novos pedidos serão recusados — comportamento intencional.

## 6. OAuth Meta/Google

- Cadastre exatamente as URLs HTTPS de callback informadas pelo projeto.
- Restrinja JavaScript origins/redirect URIs ao domínio oficial e staging controlado.
- Solicite o mínimo de escopos. Revogue acessos não usados.
- A versão endurecida não grava access/refresh tokens no D1. Para automações de campanhas, use Workers Secrets Store/secret dedicado com rotação; não restaure persistência no `marketing_config`.

## 7. R2 e documentos fiscais

- Confirme que bucket/domain browser não lista objetos nem atende diretamente chaves.
- Use lifecycle rules coerentes com retenção legal.
- Separe, idealmente, `MEDIA_PUBLICA` e `DOCUMENTOS_PRIVADOS` em buckets/bindings distintos numa evolução futura.
- Teste que `/media/private/orders/...` retorna 404 e que downloads autenticados retornam `no-store`.

## 8. Headers/CSP

Após deploy, valide CSP no console do navegador e em modo Report-Only primeiro se novas tags forem adicionadas. Não amplie para `https:` ou `*`. Remova domínios de Meta/Google que não forem usados. Planeje retirar `'unsafe-inline'` migrando código inline.

## 9. Observabilidade sem PII

- Habilite Workers Logs/Traces com amostragem apropriada.
- Não registre bodies, cookies, Authorization, tokens OAuth, CPF, endereço, telefone, e-mail completo, NF/XML ou URLs assinadas.
- Restrinja acesso aos logs e defina retenção curta (por exemplo 30–90 dias, conforme necessidade/base legal).
- Configure alertas para picos de 401/403/429/5xx e uploads recusados.

## 10. Checklist antes da produção

- Access/MFA testado; secrets configurados e rotacionados.
- R2 privado e D1 com backup/exportação testada.
- Turnstile e rate limiting validados em staging.
- Login Admin/Google, logout, expiração, CSRF e autorização entre dois clientes testados.
- NF/XML inacessíveis sem sessão e acessíveis apenas ao proprietário/Admin.
- Pixel/GA4/GTM carregam somente após consentimento aplicável.
- Política de privacidade/cookies, canal do titular, retenção e operadores revisados sob LGPD.
- Plano de resposta a incidente e restauração documentado.

