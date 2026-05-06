## Objetivo

Substituir a criação automática de certificado/profile via App Store Connect API por referências aos arquivos `.p12` e `.mobileprovision` que já estão salvos no Codemagic em **Code signing identities** (chaves `CM_CERTIFICATE`, `CM_CERTIFICATE_PASSWORD`, `CM_PROVISIONING_PROFILE`).

## Mudanças no `codemagic.yaml`

### 1. Bloco `environment.ios_signing`
Remover este bloco por completo. Ele é usado apenas pelo modo "automatic signing" (que cria/baixa certificados via API). Como agora usamos arquivos manuais, ele não é necessário e pode entrar em conflito.

Também remover `integrations.app_store_connect: Maridas` da seção `environment` (não é mais usado para signing — manter apenas se quiser publicar via TestFlight depois; nesse caso pode ficar no bloco `publishing`).

### 2. Adicionar bloco `environment.ios_signing` no formato manual

```yaml
environment:
  xcode: 26.2
  node: 22.12.0
  ios_signing:
    distribution_type: app_store
    bundle_identifier: com.healthmedia.maridas
    certificate_p12: Encrypted(Ref::CM_CERTIFICATE)
    certificate_password: Encrypted(Ref::CM_CERTIFICATE_PASSWORD)
    provisioning_profile: Encrypted(Ref::CM_PROVISIONING_PROFILE)
  vars:
    BUNDLE_ID: "com.healthmedia.maridas"
    APPLE_TEAM_ID: "22M7YZ5TMF"
    XCODE_WORKSPACE: "ios/App/App.xcworkspace"
    XCODE_PROJECT: "ios/App/App.xcodeproj"
    XCODE_SCHEME: "App"
```

Observação: o Codemagic resolve `Ref::NOME` para os arquivos/strings salvos em **Code signing identities**. Quando esse bloco está presente, o Codemagic instala automaticamente o `.p12` no keychain e copia o profile para `~/Library/MobileDevice/Provisioning Profiles/` antes dos scripts rodarem — não precisa de nenhum comando manual.

### 3. Substituir o passo "Fetch signing files via App Store Connect API"
Remover esse passo inteiro (gera private key, cria cert via API, etc.). Em vez dele, manter apenas um passo curto de validação:

```yaml
- name: Validate signing assets installed by Codemagic
  script: |
    set -e
    keychain initialize
    keychain add-certificates
    echo "--- Code signing identities ---"
    security find-identity -v -p codesigning
    echo "--- Installed provisioning profiles ---"
    ls -la "$HOME/Library/MobileDevice/Provisioning Profiles/" || true

    DIST_COUNT=$(security find-identity -v -p codesigning | grep -c "Apple Distribution" || true)
    if [ "$DIST_COUNT" -lt 1 ]; then
      echo "ERROR: Apple Distribution identity not present after Codemagic auto-install"
      exit 1
    fi
```

### 4. Ajustar o passo "Apply provisioning profiles to Xcode project"
Manter como está — `xcode-project use-profiles` lê os profiles já instalados pelo Codemagic em `~/Library/MobileDevice/Provisioning Profiles/` e aplica ao projeto. Continua exportando `CM_PROFILE_NAME` para o passo de archive.

### 5. Passo "Archive" — sem mudanças
Continua usando `CODE_SIGN_STYLE=Manual`, `PROVISIONING_PROFILE_SPECIFIER=$CM_PROFILE_NAME` e `CODE_SIGN_IDENTITY=$DIST_SHA` resolvido do keychain.

### 6. Limpeza
- Remover a key temporária `openssl genrsa` e variáveis `CERT_KEY_PATH`.
- Atualizar `.lovable/plan.md` para refletir a nova estratégia (uso de arquivos manuais ao invés da API).

## Pré-requisitos no Codemagic (manual, antes do build)

Confirmar em **Teams → seu time → Code signing identities**:
1. `.p12` salvo com referência **`CM_CERTIFICATE`** e senha **`CM_CERTIFICATE_PASSWORD`**.
2. `.mobileprovision` (App Store) salvo com referência **`CM_PROVISIONING_PROFILE`**, vinculado ao bundle `com.healthmedia.maridas`.
3. Os nomes das referências precisam ser exatamente esses — case-sensitive.

## Resultado esperado

- Build não tenta mais criar certificado via API → some o erro "Cannot save Signing Certificates without certificate private key".
- Codemagic instala o `.p12` (com private key embutida) e o profile automaticamente no início do job.
- Validação confirma `Apple Distribution` no keychain antes de seguir.
- Archive e Export usam o profile e identidade já instalados.
