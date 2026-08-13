# Salvatex — Upload de mídia via R2 sem nome fixo

Esta atualização elimina a obrigação de nomes como `foto-1.png`, `foto-2.png` ou `video.mp4`.

## Formatos aceitos
Imagens: JPG, JPEG, PNG, WebP e GIF.
Vídeos: MP4, WebM e MOV.

O backend identifica o tipo, gera um nome interno UUID, salva no R2 e devolve a URL real.

Exemplo interno:
`configuradores/wave/gaze-de-linho/branco/forro-leve/imagens/<uuid>.jpg`

O nome original do arquivo deixa de ser usado para localizar a mídia.

## Arquivos
- functions/admin/api/media/upload.js
- functions/admin/api/media/delete.js
- functions/media/[[path]].js
- js/admin-media.js

## Binding obrigatório
`MEDIA`

## Performance
Os arquivos recebem:
`Cache-Control: public, max-age=31536000, immutable`

Como cada upload recebe UUID novo, não é necessário `?v=Date.now()` para mídia enviada pelo Admin/R2.

## Próximo ajuste no Admin
Os botões de foto/vídeo devem chamar `SalvatexMedia.upload(...)` e salvar a URL retornada dentro da configuração do configurador.
