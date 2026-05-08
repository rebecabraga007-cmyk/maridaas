## Objetivo

Gerar a **imagem de destaque (feature graphic)** do Google Play Console no tamanho exato exigido: **1024×500 px** (PNG, sem transparência).

Essa é a imagem que aparece no topo da página do app na Play Store, acima das screenshots.

## O que vou gerar

Um PNG `maridaas-feature-graphic-1024x500.png` com:

- Fundo: gradiente teal (mesma paleta Maridaas das outras peças — `#5BA69A` → tom mais escuro)
- Logo Maridaas à esquerda (ou centralizado)
- Tagline em pt-BR à direita: **"A rede social das mulheres do seu bairro"**
- Sem texto pequeno nas bordas (a Play Store corta levemente em alguns dispositivos)
- Sem bordas arredondadas, sem transparência (requisito Google)

## Como vou produzir

Script Python com Pillow:
1. Criar canvas 1024×500 com gradiente teal.
2. Colar logo Maridaas (de `/mnt/documents/maridaas-icons/icon-512.png` ou do `public/`).
3. Renderizar tagline em fonte sans-serif clara, com peso bold.
4. QA: abrir o PNG e verificar legibilidade, contraste, e que nada importante encosta nas bordas.

## Saída

- `/mnt/documents/appstore-screenshots/maridaas-feature-graphic-1024x500.png`
- Link de download

## Pergunta rápida

A tagline padrão é **"A rede social das mulheres do seu bairro"**. Quer mudar para outra frase, ou seguir com essa?
