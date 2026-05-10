## Problema

O Codemagic falha no passo `Archive` com:

```
IONCameraLib_IONCameraLib does not support provisioning profiles ...
IONCameraLib does not support provisioning profiles ...
```

Causa: passamos `CODE_SIGN_STYLE=Manual` + `PROVISIONING_PROFILE_SPECIFIER` + `CODE_SIGN_IDENTITY` direto na linha de comando do `xcodebuild`. Esses valores se aplicam a **todos** os targets do build graph, incluindo as bibliotecas SPM (`IONCameraLib`, `IONCameraLib_IONCameraLib`, `Capacitor`, `Cordova`, `CameraPlugin`), que não suportam provisioning profile. O Xcode 26 passou a tratar isso como erro fatal.

A etapa `xcode-project use-profiles` já grava as configurações de assinatura **somente no target `App`** dentro do `project.pbxproj` — então não precisamos repetir esses valores como overrides globais na CLI.

## Correções

### 1. `codemagic.yaml` — passo "Archive (xcodebuild, Codemagic manual signing)"

Remover os overrides de assinatura da linha de comando do `xcodebuild`. Manter `xcode-project use-profiles` (que já roda antes) como única fonte da configuração de assinatura, escopada ao target `App`.

```yaml
xcodebuild \
  -project "$XCODE_PROJECT" \
  -scheme "$XCODE_SCHEME" \
  -configuration Release \
  -archivePath "$CM_BUILD_DIR/App.xcarchive" \
  -destination "generic/platform=iOS" \
  -skipPackagePluginValidation \
  clean archive
```

(Os logs `Using DEVELOPMENT_TEAM=...` etc. continuam sendo impressos para debug, mas não são passados ao xcodebuild.)

Com isso, os targets SPM ficam com `CODE_SIGN_STYLE=Automatic` + `CODE_SIGNING_ALLOWED=NO` (default do SPM) e só o target `App` recebe o profile manual.

### 2. Forçar versão `1.1.5`

Hoje o passo "Increment build & marketing version" calcula o patch a partir do que já existe na App Store + `MARKETING_BASE_VERSION="1.1"`. Para garantir exatamente `1.1.5`:

- Trocar `MARKETING_BASE_VERSION: "1.1"` por uma nova var `MARKETING_VERSION_OVERRIDE: "1.1.5"`.
- No script de bump, se `MARKETING_VERSION_OVERRIDE` estiver setado e for `X.Y.Z`, pular toda a lógica de cálculo e usar esse valor literal para `MARKETING_VERSION` e `CFBundleShortVersionString`. `CFBundleVersion` (build number) continua usando epoch/minutos como hoje.

Fluxo:

```text
MARKETING_VERSION_OVERRIDE set?
  ├─ yes → NEW_VERSION = override (1.1.5), pula App Store Connect lookup
  └─ no  → mantém comportamento atual (auto patch)
```

## Arquivos a alterar

- `codemagic.yaml`
  - Workflow `ios-release` → `environment.vars`: adicionar `MARKETING_VERSION_OVERRIDE: "1.1.5"`.
  - Passo "Increment build & marketing version": branch curto-circuito quando override está presente.
  - Passo "Archive (xcodebuild, Codemagic manual signing)": remover os 4 overrides de assinatura da chamada do `xcodebuild`.

## Notas

- Nada muda no código do app (React/Capacitor) nem nos plugins.
- Próxima publicação: a App Store Connect aceita `1.1.5` desde que ainda não exista uma versão `1.1.5` em estado bloqueado lá; se existir, o submit falhará e basta subir o override para `1.1.6`.
- O passo `Validate IPA CFBundleVersion` continua válido (compara build number, não marketing version).
