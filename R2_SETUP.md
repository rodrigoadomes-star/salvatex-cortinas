# Cloudflare R2 — ativar uploads

1. No Cloudflare, crie um bucket R2 para a loja (ex.: `salvatex-media`).
2. Abra o projeto Cloudflare Pages da Salvatex.
3. Vá em Settings > Functions > R2 bucket bindings.
4. Adicione o bucket com o nome de binding exatamente: `MEDIA`.
5. Salve e faça um novo deployment.
6. Entre no Admin > Integrações: Cloudflare R2 deverá aparecer como **Conectado**.
7. Em Admin > Configuradores, os botões **Enviar imagem**, **Adicionar fotos** e **Enviar vídeo** passam a funcionar.

Não é necessário tornar o bucket público: o projeto serve os arquivos através da rota `/media/...`.
