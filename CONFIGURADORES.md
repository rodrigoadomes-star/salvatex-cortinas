# Configuradores Salvatex

O painel administrativo agora possui estrutura para quatro configuradores:

- Cortina Wave
- Cortina Prega Macho
- Cortina de Varão
- Persiana sob medida

Cada configurador pode armazenar nome, descrição, limites de medidas, regra de cálculo, tecidos/materiais, descrições, cores, forros/opções, preços, trilhos/varões, fotos e vídeo.

## Mídia

A interface usa upload do computador. Para ativar os uploads, crie um bucket Cloudflare R2 e vincule-o ao projeto Pages com o binding `MEDIA`. O código já inclui upload administrativo e rota pública `/media/...`.

## Configuradores públicos

- Wave continua no configurador principal existente.
- Outros configuradores podem ser abertos por `configurador.html?id=prega-macho`, `configurador.html?id=cortina-varao` e `configurador.html?id=persiana`.

## Integrações futuras

Pagamento, ClearSale, e-mail e WhatsApp continuam indicados no painel como integrações futuras.
