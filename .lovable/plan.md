## Objetivo

Criar o certificado Apple Distribution **automaticamente na VM do Codemagic** a cada build, usando a integração App Store Connect API (`Maridas`) que já está conectada. Isso elimina o P12 manual revogado.

## Como funciona

O CLI `app-store-connect fetch-signing-files --create` (já disponível na VM do Codemagic) vai:

1. Gerar uma private key nova localmente na VM
2. Criar um novo certificado Apple Distribution via API
3. Criar/atualizar o provisioning profile App Store para `com.healthmedia.maridas`
4. Instalar certificado + profile no keychain da VM

Como a private key é gerada na própria VM, ela existe junto com o certificado — o erro "Cannot save Signing Certificates without certificate private key" não acontece.

## Pré-requisito manual (CRÍTICO antes do build rodar)

A Apple permite no máximo **2 certificados Apple Distribution ativos por time**. Hoje você já tem ao menos um inválido:

```text
Apple Distribution: HEALTH MEDIA LTDA (22M7YZ5TMF)
serial: 174C5D2EE8DE9211D0D792FF3B7BDEF
```

Antes do build:

1. Acesse https://developer.apple.com/account/resources/certificates/list
2. Filtre por **Apple Distribution**
3. **Revogue** todos os Distribution existentes do time `22M7YZ5TMF`
4. (Opcional) Delete o `maridas cert` em **Codemagic → Teams → Code signing identities → iOS certificates** — não vamos mais usá-lo

Se houver 2 Distribution ativos quando o build rodar, vai falhar com erro 409.

## Mudanças no `codemagic.yaml`

### 1. Remover o P12 manual do `ios_signing`

```yaml
ios_signing:
  distribution_type: app_store
  bundle_identifier: com.healthmedia.maridas
  # certificates: ["maridas cert"]  ← REMOVIDO
```

A integração `app_store_connect: Maridas` (já presente) continua sendo usada — é ela que fornece a API key para criar o certificado.

### 2. Substituir os passos de signing antigos

**Remover** os passos:
- "Install Codemagic P12 signing certificate"
- "Validate signing identity"
- "Re-inject provisioning profiles before archive"

**Adicionar** um único passo novo após "Initialize keychain":

```yaml
- name: Fetch signing files via App Store Connect API (auto-create cert)
  script: |
    set -e
    app-store-connect fetch-signing-files "$BUNDLE_ID" \
      --type IOS_APP_STORE \
      --create
    keychain add-certificates
    security find-identity -v -p codesigning
    DIST_COUNT=$(security find-identity -v -p codesigning | grep -c "Apple Distribution" || true)
    if [ "$DIST_COUNT" -lt 1 ]; then
      echo "ERROR: No Apple Distribution identity available"
      exit 1
    fi
```

### 3. Aplicar profiles no projeto antes do archive

```yaml
- name: Apply provisioning profiles
  script: |
    xcode-project use-profiles \
      --project "$XCODE_PROJECT" \
      --archive-method app-store
```

### 4. Manter o archive com signing manual usando os arquivos auto-fetchados

O bloco do `xcodebuild` continua igual ao atual (que já está correto):

```bash
xcodebuild ... clean archive \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" \
  CODE_SIGN_IDENTITY="$DIST_SHA"
```

`$PROFILE_NAME` e `$DIST_SHA` são extraídos do keychain/profile recém-instalados.

## Resultado esperado

- Certificado Distribution **novo, válido e com private key** criado a cada build
- Provisioning profile App Store gerado automaticamente
- Archive iOS conclui e gera `.ipa` exportável para TestFlight

## Ação adicional recomendada (segurança)

Como você colou a App Store Connect API Key no chat, **revogue essa chave** em https://appstoreconnect.apple.com/access/integrations/api e gere uma nova. Depois atualize a integração `Maridas` no Codemagic com a nova chave.