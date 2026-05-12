## Push notifications nativas no iOS via OneSignal

Você está certo: usando o SDK nativo do OneSignal, não é preciso configurar APNs manualmente no Xcode. Você só sobe a chave APNs (.p8) **uma vez** no painel do OneSignal e ele cuida do resto.

### Plugin correto

Não é `@capacitor/push-notifications` puro (esse exige você gerenciar APNs e ter um backend próprio de envio). O caminho certo, dado que já usamos OneSignal no web, é:

- **`onesignal-cordova-plugin`** — SDK oficial do OneSignal, totalmente compatível com Capacitor. Mesma `appId` do web, mesmo dashboard, mesmas regras de segmentação.

### O que vou fazer no código

1. **Instalar dependência**
   - `onesignal-cordova-plugin`

2. **Criar `src/lib/push/onesignalNative.ts`**
   - Wrapper fino sobre `OneSignal` (o objeto global do plugin).
   - Funções: `initNative(appId)`, `requestNativePermission()`, `loginNative(userId)`, `logoutNative()`, `optOutNative()`, `optInNative()`, `getNativeSubscriptionId()`.
   - Usa `import OneSignal from "onesignal-cordova-plugin"`.

3. **Atualizar `src/hooks/useOneSignalPush.ts`**
   - Em vez de marcar `isSupported=false` em native, ramificar:
     - **Native (iOS/Android)**: chama `initNative` + APIs nativas, expõe o mesmo shape (`subscribe`, `unsubscribe`, `isSubscribed`, etc).
     - **Web/PWA**: mantém o fluxo atual com SDK Web v16.
   - Busca `appId` do mesmo edge function `get-onesignal-config`.

4. **Atualizar `src/components/OnboardingModal.tsx`**
   - Em native, `pushAvailable=true` (sem prompt de "instalar PWA"), mostra botão "Ativar" normalmente.
   - Texto adaptado: no iPhone nativo o sistema abre o prompt nativo da Apple, sem instrução de instalar PWA.

5. **`capacitor.config.ts`** — sem alterações (o plugin se auto-registra após `npx cap sync`).

### Diagrama do fluxo

```text
                 ┌──────────────────────────┐
useOneSignalPush │  isNativePlatform()?     │
                 └──────────┬───────────────┘
                            │
              ┌─────────────┴─────────────┐
              │ true                       │ false
              ▼                            ▼
   onesignalNative.ts             onesignal.ts (Web v16)
   (Cordova plugin)               (CDN script)
              │                            │
              └────────► loginUser(userId) ◄────┐
                          (mesma appId)          │
                                                 │
                          Dashboard OneSignal ───┘
                          (você sobe APNs .p8 aqui)
```

### Tarefas manuais que **você** precisa fazer (uma única vez)

1. **Apple Developer Portal**:
   - Habilitar capability "Push Notifications" no App ID `com.healthmedia.maridas`.
   - Gerar uma APNs Authentication Key (.p8) — Keys → "+" → marcar "Apple Push Notifications service (APNs)" → baixar o arquivo `.p8` e anotar Key ID + Team ID.

2. **Painel OneSignal**:
   - Settings → Platforms → Apple iOS (APNs) → "Configure".
   - Subir o `.p8`, colar Key ID, Team ID, Bundle ID (`com.healthmedia.maridas`).
   - Salvar. Pronto — OneSignal envia push para iOS sozinho.

3. **Codemagic / Xcode**:
   - O `codemagic.yaml` precisa que o provisioning profile inclua a entitlement `aps-environment`. Como a capability foi habilitada no App ID, basta **regenerar o provisioning profile** no Apple Developer e re-importar no Codemagic.
   - Após `npx cap sync ios` (rodado pelo Codemagic ou localmente), o plugin adiciona automaticamente a entitlement `aps-environment` ao `Info.plist`/entitlements.

### Detalhes técnicos

- **App ID OneSignal**: o mesmo já configurado no edge function `get-onesignal-config` — não muda.
- **Service Worker** (`public/push/onesignal/OneSignalSDKWorker.js`): continua usado **só no web**; native ignora.
- **`loginUser(userId)`**: mesma chamada nos dois lados — push nativo e web ficam associados ao mesmo `external_id` (Supabase user id), então um único disparo do `send-onesignal-push` atinge web + iOS.
- **`@capacitor/push-notifications`**: **não** será instalado. Conflitaria com o plugin OneSignal e exigiria backend próprio.
- **Permission flow iOS nativo**: `OneSignal.Notifications.requestPermission(true)` dispara o prompt nativo da Apple uma única vez. Se o usuário negar, só pode ser revertido em Ajustes do iOS.

### Arquivos a alterar

- `package.json` — adiciona `onesignal-cordova-plugin`
- `src/lib/push/onesignalNative.ts` — novo
- `src/hooks/useOneSignalPush.ts` — ramificar native vs web
- `src/components/OnboardingModal.tsx` — texto/comportamento em native
- `mem://infrastructure/push-notifications/onesignal-v16` — atualizar para refletir suporte nativo
- `mem://index.md` — remover linha "OneSignal Web Push is disabled in WKWebView"
