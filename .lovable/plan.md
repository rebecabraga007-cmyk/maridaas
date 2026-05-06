## Problema no passo "Export IPA"

```
xcode-project: error: unrecognized arguments: --archive-path /Users/builder/clone/App.xcarchive
error: Couldn't load -exportOptionsPlist Failed to decode "provisioningProfiles". Expected to decode Dictionary<String, Any> but found an array instead.
```

Duas falhas:

1. `xcode-project build-ipa` recebe `--archive-path` (flag inexistente; o correto é `--archive-directory` apontando para a pasta que contém o `.xcarchive`, ou usar a flag `--archive-path` na nova sintaxe — ambíguo). Mais simples: substituir por `xcodebuild -exportArchive` direto (controle total).
2. `$HOME/export_options.plist` **não é criado em nenhum passo do YAML**. Está pegando um arquivo antigo/inválido onde `provisioningProfiles` é array em vez de dict.

## Correção em `codemagic.yaml` — passo "Export IPA"

Substituir todo o passo por uma versão que:
- Gera o `export_options.plist` corretamente (com `provisioningProfiles` como dict `{bundleId: profileName}`)
- Usa apenas `xcodebuild -exportArchive` (sem `xcode-project build-ipa`)

```yaml
- name: Export IPA
  script: |
    set -e
    EXPORT_DIR="$CM_BUILD_DIR/build/ipa"
    PLIST="$CM_BUILD_DIR/export_options.plist"
    mkdir -p "$EXPORT_DIR"

    cat > "$PLIST" <<EOF
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
      <key>method</key>
      <string>app-store</string>
      <key>teamID</key>
      <string>$APPLE_TEAM_ID</string>
      <key>signingStyle</key>
      <string>manual</string>
      <key>signingCertificate</key>
      <string>Apple Distribution</string>
      <key>provisioningProfiles</key>
      <dict>
        <key>$BUNDLE_ID</key>
        <string>$CM_PROFILE_NAME</string>
      </dict>
      <key>stripSwiftSymbols</key>
      <true/>
      <key>uploadBitcode</key>
      <false/>
      <key>uploadSymbols</key>
      <true/>
    </dict>
    </plist>
    EOF

    echo "--- export_options.plist ---"
    cat "$PLIST"

    xcodebuild \
      -exportArchive \
      -archivePath "$CM_BUILD_DIR/App.xcarchive" \
      -exportPath "$EXPORT_DIR" \
      -exportOptionsPlist "$PLIST"

    echo "--- IPA output ---"
    ls -la "$EXPORT_DIR"
```

## Resultado esperado

- O plist é gerado dinamicamente com `$APPLE_TEAM_ID`, `$BUNDLE_ID` e `$CM_PROFILE_NAME` (já exportados em passos anteriores).
- `provisioningProfiles` é um dict `{ "com.healthmedia.maridas": "<profile name>" }` — formato que o `xcodebuild` aceita.
- Sem chamada a `xcode-project build-ipa`, sem flag inexistente.
- IPA é gerado em `$CM_BUILD_DIR/build/ipa/` (caminho que o bloco `artifacts` já espera).
