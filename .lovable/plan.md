Vou ajustar apenas o fluxo iOS no `codemagic.yaml` para eliminar o erro atual.

## Diagnóstico do erro atual

O problema agora não é falta de certificado. O log mostra que o certificado existe:

```text
Using CODE_SIGN_IDENTITY SHA=4795D67BDC162A4D4CDF394E1AD8207BE801774A
```

Mas o comando passa dois overrides de `CODE_SIGN_IDENTITY`:

```text
CODE_SIGN_IDENTITY="Apple Distribution"
"CODE_SIGN_IDENTITY[sdk=iphoneos*]=Apple Distribution"
```

No Xcode 26.2, esse segundo argumento está sendo interpretado incorretamente. O log confirma:

```text
CODE_SIGN_IDENTITY = iphoneos*]=Apple Distribution
No certificate ... matching 'iphoneos*]=Apple Distribution' found
```

Ou seja: o valor real virou `iphoneos*]=Apple Distribution`, então o Xcode tenta procurar um certificado com esse nome inválido.

## Plano de correção

1. Remover o override problemático:

```text
"CODE_SIGN_IDENTITY[sdk=iphoneos*]=Apple Distribution"
```

2. Usar o SHA real do certificado Distribution já encontrado no keychain, em vez do nome genérico:

```text
CODE_SIGN_IDENTITY="$DIST_SHA"
```

3. Manter signing manual limpo:

```text
CODE_SIGN_STYLE=Manual
DEVELOPMENT_TEAM=$APPLE_TEAM_ID
PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID"
PROVISIONING_PROFILE_SPECIFIER="$CM_PROFILE_NAME"
```

4. Manter o fluxo atual de provisioning profile:

```text
xcode-project use-profiles --archive-method app-store
```

5. Adicionar validações antes do archive para imprimir:

```text
Signing identity: Apple Distribution
Provisioning profile: maridas
Team ID: 22M7YZ5TMF
Bundle ID: com.healthmedia.maridas
```

## Configuração final esperada do build

O archive deve ficar conceitualmente assim:

```bash
xcodebuild \
  -project "$XCODE_PROJECT" \
  -scheme "$XCODE_SCHEME" \
  -configuration Release \
  -archivePath "$CM_BUILD_DIR/App.xcarchive" \
  -destination "generic/platform=iOS" \
  -skipPackagePluginValidation \
  clean archive \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  PROVISIONING_PROFILE_SPECIFIER="$CM_PROFILE_NAME" \
  CODE_SIGN_IDENTITY="$DIST_SHA"
```

## Scripts removidos / alterados

- Remover apenas o argumento inválido de signing por SDK.
- Alterar `CODE_SIGN_IDENTITY="Apple Distribution"` para usar o SHA real já detectado: `CODE_SIGN_IDENTITY="$DIST_SHA"`.
- Não voltar para automatic signing.
- Não criar certificado novo.
- Não usar `.cer` isolado.
- Não usar certificado Apple sem private key.
- Não misturar manual com automático.

## Resultado esperado

Depois da alteração, o Xcode não deve mais procurar por:

```text
iphoneos*]=Apple Distribution
```

Ele deve usar diretamente a identidade local com private key instalada pelo P12 `maridas cert`, junto com o provisioning profile `maridas`, para concluir o archive iOS.