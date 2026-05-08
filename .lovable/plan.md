## Objetivo

Criar o ícone oficial do Maridaas reaproveitando o logo existente (`public/logo.png` — duas mulheres em formato infinito, teal/dourado/rosa) sobre **fundo teal sólido `#5BA69A`**, e aplicá-lo tanto no PWA (manifest) quanto no app nativo iOS/Android gerado pelo Codemagic.

## O que vai ser feito

### 1. Gerar os arquivos de ícone (script único)

Rodar um script Node/Sharp que pega `public/logo.png`, centraliza com margem de segurança (~18%) sobre um quadrado teal sólido, e exporta:

- `public/icon-512.png` — 512×512 (PWA)
- `public/icon-192.png` — 192×192 (PWA)
- `public/apple-touch-icon.png` — 180×180 (iOS web)
- `resources/icon-only.png` — 1024×1024 (master para nativo)
- `resources/icon-foreground.png` — 1024×1024 (logo só, fundo transparente, com padding de 25% para Android adaptive)
- `resources/icon-background.png` — 1024×1024 (teal sólido `#5BA69A`)
- `public/favicon.png` — 256×256 (substitui o atual)

### 2. Atualizar o `public/manifest.json`

Trocar a referência genérica `/logo.png` pelos novos `icon-192.png` e `icon-512.png` com `purpose: "any maskable"` corretos.

### 3. Atualizar `index.html`

Adicionar `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` e atualizar referência do favicon.

### 4. Wiring no build nativo (Codemagic)

Capacitor recria as pastas `ios/` e `android/` a cada build, então os ícones precisam ser **regenerados a cada execução**. Solução:

- Instalar `@capacitor/assets` como devDependency
- Adicionar um step no `codemagic.yaml` (workflows iOS e Android), **logo após o `npx cap add`**, executando:
  ```
  npx @capacitor/assets generate --iconBackgroundColor '#5BA69A' --iconBackgroundColorDark '#5BA69A'
  ```
  Isso lê `resources/icon-only.png` + `resources/icon-foreground.png` + `resources/icon-background.png` e gera todos os tamanhos corretos para iOS (`AppIcon.appiconset`) e Android (mipmap + adaptive icon).

## Detalhes técnicos

- **Cor de fundo:** `#5BA69A` (teal já usado no `manifest.json` como `theme_color`)
- **Safe area do logo:** margem interna de ~18% para iOS / 25% para foreground Android (evita corte no adaptive icon circular/squircle)
- **Composição:** o logo branco/colorido atual fica visualmente forte sobre o teal — alta legibilidade no springboard
- **QA visual:** depois de gerar, vou abrir os PNGs (512 e foreground) para conferir centralização, recorte e contraste antes de finalizar

## Arquivos alterados

- `public/manifest.json`
- `index.html`
- `codemagic.yaml` (1 step novo em cada workflow)
- `package.json` (adiciona `@capacitor/assets`)
- Novos: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/favicon.png` (substituído), `resources/icon-only.png`, `resources/icon-foreground.png`, `resources/icon-background.png`

## O que você precisa fazer depois

Nada na Lovable. No próximo build do Codemagic, o app já vai sair com o ícone novo na tela inicial do iPhone/Android. Para PWA, basta dar reload — o navegador pega o novo manifest.

Posso seguir?
