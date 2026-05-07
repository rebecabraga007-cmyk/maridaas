## Objetivo

Gerar capturas de tela de **smartphone Android** (formato retrato 9:16) para upload no Google Play Console → "Páginas de detalhes do app", já que você só tem as do iPad até agora.

## O que a Play Store exige

- 2 a 8 imagens PNG/JPEG
- Proporção 16:9 ou 9:16 (vou usar **9:16 retrato**, padrão para apps mobile)
- Cada lado entre 320 e 3840 px
- Tamanho recomendado: **1080×1920** (Full HD retrato, padrão Android)

## O que vou gerar

7 mockups no formato **1080×1920** (9:16), no mesmo estilo das capturas de iPad já criadas — fundo teal degradê, logo Maridaas no topo, screenshot do app abaixo com legenda em pt-BR:

1. `maridaas-android-1-1080x1920.png` — Feed / Mural
2. `maridaas-android-2-1080x1920.png` — Bairros (vizinhança)
3. `maridaas-android-3-1080x1920.png` — Serviços
4. `maridaas-android-4-1080x1920.png` — Mensagens / Inbox
5. `maridaas-android-5-1080x1920.png` — Perfil
6. `maridaas-android-6-1080x1920.png` — Premium
7. `maridaas-android-7-1080x1920.png` — Notificações / Onboarding

## Como vou produzir

1. Reusar o mesmo script Puppeteer que gerou os mockups de iPad, mudando viewport para 390×844 (iPhone-like, mas serve de base mobile genérico) e canvas de saída para 1080×1920.
2. Navegar no preview Lovable com login mock (mesma abordagem das capturas anteriores).
3. Compor: gradiente teal + logo + título em pt-BR + screenshot com cantos arredondados + sombra.
4. QA: abrir cada PNG e conferir legibilidade, recorte e ausência de elementos cortados.
5. Empacotar tudo num `maridaas-android-screenshots.zip` para download.

## Saída

- 7 PNGs em `/mnt/documents/appstore-screenshots/`
- 1 ZIP em `/mnt/documents/maridaas-android-screenshots.zip`
- Links de download (`<lov-artifact>`)

## O que você faz depois

No Google Play Console → "Adicionar recursos" → upload dos 7 PNGs (ou só os que preferir, mínimo 2).

Posso seguir?
