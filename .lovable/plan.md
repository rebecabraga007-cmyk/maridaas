
# Corrigir publicação web + build iOS para App Store

## Diagnóstico

### 1. Web publicada (maridaas.lovable.app)
- Console mostra `supabaseUrl is required` no bundle `index-CP8TdlsP.js`.
- O código atual (`src/integrations/supabase/client.ts`) está correto e o preview funciona (chamadas Supabase OK).
- Conclusão: o publicado está com um bundle antigo, gerado antes das `VITE_SUPABASE_*` estarem disponíveis no build.
- A tentativa anterior (criar `public/build-stamp.txt`) não força a Lovable a republicar — só clicar em **Publicar → Atualizar** dispara um novo build.

### 2. Build iOS (Codemagic / Capacitor)
Foram encontradas 3 inconsistências que vão causar problema na App Store ou no próximo build:

1. **Bundle ID divergente**
   - `capacitor.config.ts` → `appId: 'com.maridas.app'`
   - `codemagic.yaml` → `BUNDLE_ID: 'com.healthmedia.maridas'` (e provisioning profile/cert apontam para esse)
   - Como o YAML recria o iOS do zero (`rm -rf ios && cap add ios`), o projeto Xcode nasce com `com.maridas.app` e depois é forçado para `com.healthmedia.maridas` via `PRODUCT_BUNDLE_IDENTIFIER`. Isso funciona, mas é frágil e o `Info.plist`/`appId` ficam inconsistentes — risco de rejeição por mismatch entre app e provisioning.

2. **Lockfiles desalinhados**
   - `package.json` declara Capacitor `^8.3.1`.
   - `package-lock.json` ainda está em Capacitor `7.6.2`.
   - `bun.lock` em `8.3.1`.
   - O Codemagic usa `npm ci` → vai falhar ou instalar versão errada (já cai no fallback `npm install`, gerando builds não-determinísticos).

3. **`appName` mostrado para o usuário**
   - `capacitor.config.ts` → `appName: 'maridaas'` (minúsculo). O nome de exibição na home iOS sai como `maridaas`. Provavelmente queremos `Maridaas`.

## O que será feito

### Frente A — Republicar a web (você precisa clicar)
- Eu não consigo apertar Publicar por você. Após terminar a Frente B, você precisa abrir **Publicar → Atualizar** no canto superior direito do editor. Depois abra `https://maridaas.lovable.app` com **Ctrl/Cmd+Shift+R**. O bundle vai deixar de ser `index-CP8TdlsP.js` e a tela em branco some.

### Frente B — Acertar projeto iOS de vez
1. **Alinhar bundle ID** em `capacitor.config.ts`:
   - `appId: 'com.healthmedia.maridas'` (igual ao certificado/profile da Apple).
   - `appName: 'Maridaas'` (capitalizado para ficar bonito na home screen).
2. **Sincronizar lockfile**: regenerar `package-lock.json` com Capacitor 8.x para `npm ci` funcionar de forma determinística.
3. **Limpar `codemagic.yaml`**:
   - Remover o `npm install @capacitor/...` redundante (já vem do `npm ci`).
   - Remover o passo `Recreate iOS platform from scratch` automático e trocar por `cap add ios` apenas se `ios/` não existir, OU manter o `rm -rf ios` mas garantir que o `appId` correto venha do `capacitor.config.ts` (que agora bate com o BUNDLE_ID). Vou manter o `rm -rf` (mais previsível em CI) já que o config fica certo.
   - Remover override redundante do `PRODUCT_BUNDLE_IDENTIFIER` (passa a vir naturalmente do config).
   - Manter incremento automático de `CFBundleVersion` (build) e `CFBundleShortVersionString` baseados em `MARKETING_BASE_VERSION=1.1`.
4. **Validar versão**: garantir que após o build o `Info.plist` final mostre `1.1.x` e um `CFBundleVersion` maior que o último enviado à App Store (já é feito hoje via epoch/min e remote check — mantemos).

### Frente C — Verificação pós-build
- Após eu aplicar B, você roda o pipeline no Codemagic. No log, conferir:
  - `MARKETING_VERSION = 1.1.x`
  - `CFBundleVersion = <epoch/60>` (sempre crescente)
  - `PRODUCT_BUNDLE_IDENTIFIER = com.healthmedia.maridas`
  - Archive + Export IPA OK e upload pra TestFlight.

## Arquivos que serão alterados (Frente B)
- `capacitor.config.ts` (appId, appName)
- `package-lock.json` (regenerar)
- `codemagic.yaml` (limpeza dos passos redundantes)

Nenhum código de aplicação (React, Supabase, edge functions) será tocado — o app em si está funcionando, o problema é só publicação e empacotamento mobile.
