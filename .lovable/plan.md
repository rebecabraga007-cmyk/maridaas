# Plano de aprovação na App Store (iOS)

Auditoria do código mostrou que:
- O projeto **não tem `@capacitor/camera` instalado** — `ImageUpload.tsx` usa `<input type="file" accept="image/*">`. No iOS isso abre o picker nativo (Tirar foto / Fototeca / Arquivos). O crash provavelmente vem de **falta de `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription`** no `Info.plist` do projeto Xcode, que é gerado fora do repo.
- **Não há código Stripe atualmente em `src/`** (foi removido), mas a memória do projeto registra fluxo Premium R$29,90 com checkout Stripe via `window.location.href`. Precisamos garantir que **nada relacionado a checkout externo seja exibido em iOS**, hoje e no futuro.
- Capacitor 8 iOS já está instalado, mas `capacitor.config.ts` usa `appId: com.healthmedia.maridas` (Bundle ID que vai para a App Store).
- Erros de console mostram falha ao chamar `get-onesignal-config` — não é causa de rejeição mas afeta estabilidade.

## 1. Política Apple 3.1.1 — Pagamentos externos

**Criar `src/lib/platform.ts`** com helpers:
- `isIOSNative()` → true quando `Capacitor.getPlatform() === 'ios'` em `isNativePlatform()`.
- `isPaymentsAllowed()` → `false` no iOS nativo, `true` em web/Android.

**Criar `src/hooks/useSubscription.ts`** centralizando estado premium e expondo:
- `canShowUpgradeUI` (= `isPaymentsAllowed()`)
- `startCheckout()` que **lança erro** se chamado em iOS
- No iOS, retorna `isPremium: true` temporariamente (acesso liberado até StoreKit ser implementado), conforme pedido.

**Esconder em iOS** qualquer botão/CTA/texto de:
- "Assinar Premium", "Upgrade", "Fazer upgrade", "Continuar com Premium"
- Modais de paywall, banners de trial expirado
- Qualquer `window.location.href` ou `window.open` apontando para Stripe/checkout
- Pesquisar e blindar com `{!isIOSNative() && ...}` (mesmo que hoje não exista UI Stripe, deixar a barreira pronta para futuras edições)

**Arquitetura preparada para StoreKit**: `useSubscription` exporta `purchaseIOS()` como stub que chamará `@capacitor-community/in-app-purchases-2` quando integrado.

## 2. Câmera / foto de perfil — eliminar crash

**Trocar `<input type=file>` por Capacitor Camera quando nativo:**
- Instalar `@capacitor/camera`.
- Refatorar `src/components/ImageUpload.tsx` para:
  - Em web → manter input file atual.
  - Em nativo → abrir um `ActionSheet` com "Tirar foto" / "Escolher da galeria" / "Cancelar"; chamar `Camera.getPhoto({ source: CameraSource.Camera | Photos, resultType: CameraResultType.Uri, quality: 80, allowEditing: false })`.
  - Envolver tudo em `try/catch`, ignorar silenciosamente erro `User cancelled photos app`.
  - Verificar `Camera.checkPermissions()` e pedir com `requestPermissions()`; se `denied`, mostrar toast "Permissão negada — habilite Câmera/Fotos em Ajustes".
  - Converter `webPath` para Blob via `fetch(webPath).then(r=>r.blob())` e fazer upload para Supabase Storage com o mesmo path atual.
  - Compatibilidade iPad: `Camera.getPhoto` já usa popover; nada extra necessário, mas evitar exibir sobre modal aberto sem `presentationStyle`.

**Documentar `Info.plist`** (em README + `.lovable/plan.md`) — strings obrigatórias:
```
NSCameraUsageDescription = "O Maridaas precisa da câmera para você atualizar sua foto de perfil."
NSPhotoLibraryUsageDescription = "O Maridaas acessa suas fotos para você escolher uma imagem de perfil."
NSPhotoLibraryAddUsageDescription = "O Maridaas salva imagens na sua galeria quando solicitado."
NSUserTrackingUsageDescription (se OneSignal pedir) = "Usado apenas para enviar notificações relevantes."
```
(Esses textos vão no Xcode — fora do repo. Vamos listar passo a passo no README.)

## 3. Estabilidade geral iOS

- Manter `ErrorBoundary` global (já existe) e adicionar boundaries internos por rota pesada (Feed, Profile, Messages).
- Já existem handlers `window.error` / `unhandledrejection` em `main.tsx` — adicionar logs estruturados via `handleError`.
- `useServices`, `useNotifications`, hooks com `await supabase` → garantir `try/catch` + estado `error` + fallback UI.
- `supabase.functions.invoke` com timeout via `AbortController` (8s) para evitar travas em rede ruim.
- Corrigir o erro do console: `get-onesignal-config` falhando — fazer call defensiva (já tem retorno tratado, mas não logar como `error` no console em primeiro carregamento, virar `info`).
- `ImageUpload` adicionar checagem `mounted` para evitar setState em componente desmontado durante upload.
- Revisar `HashRouter` em nativo (já feito) — confirmar que deep links abrem a rota correta.

## 4. Screenshots da App Store

Plano de capturas (sem mockups, UI real):

**iPhone 6.5" (1284×2778) — 6 imagens**
1. Feed do bairro com posts reais — headline "Conecte-se com mulheres do seu bairro"
2. Perfil próprio com bio, foto, bairros — "Seu espaço, seu bairro"
3. Lista de Serviços/indicações — "Indicações de quem você confia"
4. Detalhe de um post com comentários — "Conversas seguras entre vizinhas"
5. Inbox / mensagens diretas — "Mensagens privadas no seu bairro"
6. Tela de bairros (escolha primário/secundário) — "Você em até 2 bairros"

**iPad 13" (2064×2752) — 3 imagens**
1. Feed em layout responsivo
2. Perfil + Serviços lado a lado
3. Mensagens em tela cheia

Diretrizes:
- Sem splash/login isolado, sem renders 3D, sem texto promocional pesado.
- Headline em português, fonte sans-serif do app, contraste alto, marca discreta no rodapé.
- Mostrar dados realistas (nomes brasileiros, bairros reais, fotos diversas).

## 5. Checklist final de QA Apple Review

- [ ] Login email/senha + Sign in with Apple funcionando
- [ ] Onboarding (PWA / nativo) sem travar em iPad
- [ ] Câmera: tirar foto, escolher da galeria, cancelar, negar permissão (4 fluxos)
- [ ] Upload de imagem em post, serviço e perfil
- [ ] Nenhum botão de pagamento/upgrade visível em iOS
- [ ] Trial expirado em iOS → acesso mantido (sem paywall externo)
- [ ] Modo offline: feed mostra estado vazio, sem crash
- [ ] iPad portrait + landscape em todas as rotas principais
- [ ] Deep links `/feed`, `/profile/:id`, `/neighborhoods/:id` (HashRouter)
- [ ] Push notifications: permissão, recebimento, abertura
- [ ] Sessão persiste após fechar e reabrir o app
- [ ] Falha de API mostra toast, não tela branca
- [ ] Loading skeletons em Feed/Services/Inbox
- [ ] Navegação: voltar nativo + bottom nav sem perda de estado
- [ ] Nenhum link externo de pagamento (Stripe/PayPal) no app iOS
- [ ] LGPD: tela "Excluir conta" funcionando (já implementada)

## Arquivos que serão alterados

- **Novo** `src/lib/platform.ts`
- **Novo** `src/hooks/useSubscription.ts`
- **Editar** `src/components/ImageUpload.tsx` (Camera nativa + permissões + try/catch)
- **Editar** `src/main.tsx` (logs mais defensivos)
- **Editar** `src/components/ErrorBoundary.tsx` (telemetria leve)
- **Editar** `src/hooks/useNotifications.ts` / `useOneSignalPush.ts` (silenciar erro inicial de config)
- **Editar** `package.json` (+ `@capacitor/camera`)
- **Editar** `README.md` (passos `Info.plist` + sync nativo)
- **Editar** `.lovable/plan.md` (registro)
- **Sem mudanças** em `codemagic.yaml` (foco aqui é iOS/Apple, build Android já estabilizado)

## Observação importante

O **projeto Xcode não está versionado** neste repo (Capacitor gera fora). As mudanças em `Info.plist` e ícones precisam ser feitas localmente após `npx cap sync ios`. Vou deixar instruções explícitas no README.

Quero que eu prossiga com a implementação?
