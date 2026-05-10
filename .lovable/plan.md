## Objetivo
Gerar **10 screenshots reais do app** em **2048×2732 (retrato, iPad 13")**, prontas para upload na App Store Connect.

## Telas selecionadas (essenciais, públicas)

Como você optou por capturar apenas conteúdo público (sem login), o conjunto de 10 será montado a partir das páginas acessíveis sem autenticação + a tela de auth + páginas legais. Vou variar estados (vazio, com conteúdo, modal aberto) para evitar repetição.

| # | Rota | Estado |
|---|------|--------|
| 1 | `/` (Landing) | Topo / hero |
| 2 | `/` (Landing) | Seção de features / como funciona |
| 3 | `/` (Landing) | Rodapé com CTA |
| 4 | `/auth` | Tela de login (aba "Entrar") |
| 5 | `/auth` | Tela de cadastro (aba "Criar conta") |
| 6 | `/feed` | Redireciona para `/auth` → captura do estado de boas-vindas |
| 7 | `/privacidade` | Topo da política |
| 8 | `/privacidade` | Seção de direitos LGPD |
| 9 | `/termos` | Topo dos termos |
| 10 | `/404` (rota inexistente) | Página NotFound estilizada |

> Se preferir cobrir mais telas autenticadas (Feed real, Serviços, Bairros, Perfil, Mensagens), basta me passar credenciais de uma conta de teste e eu refaço a seleção — fica muito mais representativo para o review da Apple.

## Como vou gerar

1. **Abrir o preview do app no browser headless** em viewport `1024×1366` CSS pixels (iPad 13" lógico em retrato).
2. Navegar para cada rota da lista acima.
3. Capturar screenshot em alta densidade (`devicePixelRatio` 2 → resultado 2048×2732 nativo).
4. Para cada captura, rodar um passe em Python/Pillow para:
   - Garantir dimensão exata `2048×2732` (resize/crop se necessário, mantendo proporção).
   - Salvar como PNG sem perdas em `/mnt/documents/appstore/ipad-13/`.
5. Nomear sequencialmente: `ipad13-01-landing-hero.png`, `ipad13-02-landing-features.png`, etc.
6. Entregar cada arquivo com tag `<lov-artifact>` para download direto.

## Detalhes técnicos

- Viewport CSS usado: `1024×1366` (ponto lógico do iPad Pro 12.9"/13").
- Densidade de captura: 2x → bitmap `2048×2732`.
- Sem moldura de iPad, sem legendas promocionais (você pediu "captura pura").
- Sem login: rotas protegidas (`/feed`, `/profile`, etc.) renderizam o redirect para `/auth`, então não vou tentar forçá-las.
- As capturas refletem o **estado atual do preview** — sem dados sensíveis, sem indicadores de Stripe (já removidos), sem tela Premium.

## Resultado entregue

10 PNGs `2048×2732` salvos em `/mnt/documents/appstore/ipad-13/`, com link de download para cada um, prontos para arrastar no App Store Connect → "iPad Pro (12.9-inch) Display".
