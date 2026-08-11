# Backend + Banco de Dados — Salvatex

Esta versão já contém um backend real usando **Cloudflare Pages Functions + D1**.

## O que já está pronto

- `functions/api/health.js` → testa se o banco está conectado.
- `functions/api/pedidos/index.js` → registra/atualiza o pedido no servidor.
- `database/schema.sql` → cria as tabelas do banco.
- Checkout grava o pedido no D1 antes de seguir para pagamento.
- O número oficial do pedido é criado no servidor (`STX-AAAAMMDD-XXXXXXXX`).
- Itens são salvos individualmente para futura tela de pedidos do Admin.
- Histórico básico é salvo em `order_events`.
- Estrutura futura de cobrança SaaS já existe em `platform_billing` (1% ou mínimo R$150).

## 1. Criar o banco D1

No Cloudflare Dashboard:

1. Workers & Pages.
2. D1 SQL Database / D1.
3. Criar banco chamado, por exemplo, `salvatex-db`.
4. Abra o banco e use o Console SQL.
5. Copie todo o conteúdo de `database/schema.sql` e execute.

## 2. Conectar o banco ao Pages

No projeto `salvatex-cortinas`:

1. Settings.
2. Bindings.
3. Add binding.
4. Selecione **D1 database**.
5. Variable name: `DB`.
6. Escolha o banco `salvatex-db`.
7. Salve e faça um novo deploy.

O nome `DB` é obrigatório porque as Functions usam `context.env.DB`.

## 3. Testar

Após o deploy, abra:

`/api/health`

Deve retornar aproximadamente:

```json
{
  "ok": true,
  "database": true,
  "service": "salvatex-api"
}
```

## 4. Testar um pedido

Faça uma compra de teste pelo site:

Configurador → Carrinho → Checkout → Continuar para pagamento.

Antes de abrir `pagamento.html`, o checkout faz um POST em `/api/pedidos`.

Se o banco estiver indisponível, ele não avança e mostra uma mensagem de erro. Isso evita que um pedido real siga sem ser registrado.

## Segurança / observação importante

Nesta etapa o servidor registra o pedido de verdade, mas os preços ainda são originados pelo configurador no navegador. A API valida valores negativos e a consistência `preço × quantidade = total`, porém o próximo estágio do projeto será mover catálogo/preços para o banco/Admin para que o servidor recalcule o valor com uma fonte confiável antes da cobrança real.

Não libere pagamento real até essa validação de preço no backend estar implementada.

## Próximas etapas

1. Catálogo e preços no D1/Admin.
2. Recalcular preço no backend.
3. Mercado Pago (PIX/cartão).
4. Webhooks.
5. Painel Admin de pedidos/produtos.
6. ClearSale.
