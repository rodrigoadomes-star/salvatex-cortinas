# E-mail transacional e segurança da conta

O código de confirmação de troca de e-mail e recuperação de senha está preparado, mas permanece indisponível até configurar no Cloudflare Pages (produção):

- `RESEND_API_KEY`: variável secreta, com chave Resend limitada a envio.
- `EMAIL_FROM`: remetente de domínio verificado, por exemplo `Salvatex <conta@updates.exemplo.com>`.

Não coloque a chave no GitHub, JavaScript do navegador ou variável de texto simples. Verifique um subdomínio no Resend e configure SPF/DKIM no DNS antes de ativar.

Os links são de uso único, armazenados apenas como hash e expiram em 20 minutos (senha) ou 30 minutos (e-mail). A troca de senha ou e-mail incrementa a versão de sessão e revoga as demais sessões. Pedidos antigos preservam seus dados históricos. O CPF confirmado na primeira compra fica bloqueado para edição pelo cliente.

Limitação: o envio real depende da conta Resend, domínio verificado, DNS e chave fornecida pelo responsável da loja.

