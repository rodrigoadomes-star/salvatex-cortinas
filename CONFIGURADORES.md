# Configuradores — Salvatex Admin

A área **Configuradores** é a fonte administrativa para produtos sob medida.

## Wave

O configurador Wave agora permite editar pelo Admin:

- nome e status;
- largura mínima/máxima;
- altura mínima;
- altura máxima que o cliente pode informar;
- altura calculada automaticamente (ex.: 3,20 m);
- início e percentual do acréscimo;
- comportamento acima do limite: mensagem, botão e carrinho;
- faixas de barra;
- tecidos;
- cores;
- forros e preço por metro;
- trilhos/varões, preço por metro e mínimo;
- fotos e vídeos por combinação tecido + cor + forro.

A configuração é salva em `store_configs` com a chave `configurator_wave`.

O `config.js` permanece somente como fallback de segurança.

## Mídia

No painel pode ser informado caminho já existente, por exemplo:

`imagens/galeria/gaze/wave/branco/forro-leve/foto-1.png`

ou uma URL pública. O upload de arquivo direto pelo painel pode ser conectado ao Cloudflare R2 em uma etapa futura.

## Acima de 3,20 m

O valor 3,20 m não fica mais travado no código. É editável em **Configuradores → Wave → Regras de medidas e altura**.
