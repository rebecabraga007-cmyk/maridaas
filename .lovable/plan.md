# Fix: garantir privacy usage descriptions no IPA iOS

## Problema

A Apple rejeitou a build (erro **ITMS-90683**) porque o `Info.plist` do IPA não contém:

- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

A pasta `ios/` **não existe no repositório** — o pipeline Codemagic (`ios-release`) recria tudo a cada build com `rm -rf ios && npx cap add ios && npx cap sync ios`. O template padrão do Capacitor iOS **não inclui** essas três chaves, então toda build sai sem elas. Editar o `Info.plist` manualmente seria perdido na próxima build.

## Solução

Injetar as três chaves automaticamente via `PlistBuddy` **dentro do pipeline**, logo após `cap sync` e antes do archive. Como `ios/` é regenerado a cada build, esta é a única fonte de verdade duradoura. Adicionalmente, validar a presença das chaves no IPA final para falhar a build (em vez de a Apple) caso algo regrida.

Sem mudanças no código React/Capacitor — o plugin `@capacitor/camera` continua igual.

## Mudanças

### 1. `codemagic.yaml` — novo step "Inject iOS privacy usage descriptions"

Inserido **logo após** `Recreate iOS platform from scratch` e **antes** de `Generate native app icons`. Usa `PlistBuddy` com `Add` + fallback `Set` (idempotente — funciona em rebuild ou em re-run).

```yaml
- name: Inject iOS privacy usage descriptions
  script: |
    set -e
    PLIST="ios/App/App/Info.plist"
    if [ ! -f "$PLIST" ]; then
      echo "ERROR: $PLIST missing — cap sync did not generate iOS project"
      exit 1
    fi

    set_key() {
      local key="$1"
      local value="$2"
      /usr/libexec/PlistBuddy -c "Add :$key string $value" "$PLIST" 2>/dev/null \
        || /usr/libexec/PlistBuddy -c "Set :$key $value" "$PLIST"
      echo "  $key set"
    }

    set_key "NSCameraUsageDescription" \
      "Permitir acesso à câmera para tirar fotos de perfil e enviar imagens no aplicativo."
    set_key "NSPhotoLibraryUsageDescription" \
      "Permitir acesso à galeria para selecionar fotos de perfil e compartilhar imagens no aplicativo."
    set_key "NSPhotoLibraryAddUsageDescription" \
      "Permitir salvar imagens geradas ou editadas pelo aplicativo na galeria."

    echo "--- Info.plist privacy keys ---"
    /usr/libexec/PlistBuddy -c "Print :NSCameraUsageDescription" "$PLIST"
    /usr/libexec/PlistBuddy -c "Print :NSPhotoLibraryUsageDescription" "$PLIST"
    /usr/libexec/PlistBuddy -c "Print :NSPhotoLibraryAddUsageDescription" "$PLIST"
```

### 2. `codemagic.yaml` — reforço no step "Validate IPA CFBundleVersion"

Adicionar verificação das três chaves no `Info.plist` extraído do IPA (final source of truth). Falha a build com mensagem clara se faltar qualquer uma — protege contra regressão futura.

```bash
for KEY in NSCameraUsageDescription NSPhotoLibraryUsageDescription NSPhotoLibraryAddUsageDescription; do
  VAL=$(/usr/libexec/PlistBuddy -c "Print :$KEY" "$APP_PLIST" 2>/dev/null || true)
  if [ -z "$VAL" ]; then
    echo "ERROR: IPA missing required privacy key: $KEY (App Store error 90683)"
    exit 1
  fi
  echo "OK — $KEY present in IPA"
done
```

### 3. `README.md`

Atualizar o bloco "iOS — App Store submission checklist" para deixar claro que **não é mais necessário** editar o `Info.plist` manualmente — o pipeline injeta as três chaves automaticamente. As strings exatas usadas pelo pipeline ficam documentadas no README como referência.

### 4. Arquivos **não** modificados

- `capacitor.config.ts` — Capacitor CLI não suporta declarar usage descriptions via `capacitor.config` (apenas plugins Android/iOS nativos). Continuar como está.
- `package.json` — sem postinstall (rodaria localmente sem `ios/`, criando ruído). A injeção fica no pipeline, que é o único lugar onde `ios/` existe.
- `src/components/ImageUpload.tsx` — já trata permissões corretamente via `Camera.requestPermissions`.

## Compatibilidade verificada

- ✅ Capacitor 8 + `@capacitor/camera` 8 (já no `package.json`)
- ✅ Xcode 26.2 (versão atual do pipeline)
- ✅ iOS 18+ (chaves padrão Apple, mesmas há anos)
- ✅ App Store Review (cobre erros ITMS-90683 para Camera + PhotoLibrary + PhotoLibraryAdd)
- ✅ Idempotente — re-runs do pipeline não duplicam chaves nem falham
