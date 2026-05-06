## Problema

O Codemagic rejeita o YAML com:
```
ios-release -> environment -> ios_signing -> certificate_p12  extra fields not permitted
ios-release -> environment -> ios_signing -> certificate_password  extra fields not permitted
ios-release -> environment -> ios_signing -> provisioning_profile  extra fields not permitted
```

Esses campos (`certificate_p12`, `certificate_password`, `provisioning_profile`) **não existem** no schema do `codemagic.yaml`. Eles são apenas campos da UI do builder visual. Pela [doc oficial](https://docs.codemagic.io/yaml-code-signing/signing-ios/), o `ios_signing` no YAML aceita apenas duas formas:

1. **Por distribution_type + bundle_identifier** (busca automática nos arquivos salvos em Code signing identities que casam)
2. **Por reference names** (`provisioning_profiles:` e `certificates:` listando os nomes salvos)

A senha do `.p12` **não vai no YAML** — ela é armazenada junto com o `.p12` quando você faz upload em **Code signing identities**, e o Codemagic a usa automaticamente.

## Solução: usar reference names (mais explícito e robusto)

Como você já tem o `.p12` salvo como `CM_CERTIFICATE` e o profile como `CM_PROVISIONING_PROFILE`, vamos usar a forma 2 — ela é mais explícita e independe de "matching" automático.

### Mudanças em `codemagic.yaml`

**1. Substituir o bloco `ios_signing`** (atualmente com `certificate_p12`/`certificate_password`/`provisioning_profile`) por:

```yaml
ios_signing:
  provisioning_profiles:
    - CM_PROVISIONING_PROFILE
  certificates:
    - CM_CERTIFICATE
```

Sem `distribution_type` nem `bundle_identifier` (a doc diz explicitamente: "when fetching individual files, the fields `distribution_type` and `bundle_identifier` are not allowed").

**2. Remover o passo "Initialize keychain" e o "Validate signing assets installed by Codemagic"**

A doc é explícita: "Steps `Initialize keychain` & `Add certificates to keychain` scripts are **not required** as those are automatically fetched during the build process" quando se usa reference names. O Codemagic já instala `.p12` no keychain (usando a senha salva junto com o arquivo) e copia o profile para `~/Library/MobileDevice/Provisioning Profiles/` antes de qualquer script rodar.

Vou substituir esses dois passos por um único passo curto de validação:

```yaml
- name: Validate signing assets
  script: |
    set -e
    echo "--- Code signing identities ---"
    security find-identity -v -p codesigning
    echo "--- Installed provisioning profiles ---"
    ls -la "$HOME/Library/MobileDevice/Provisioning Profiles/" || true
    DIST_COUNT=$(security find-identity -v -p codesigning | grep -c "Apple Distribution" || true)
    if [ "$DIST_COUNT" -lt 1 ]; then
      echo "ERROR: Apple Distribution identity missing"
      exit 1
    fi
```

**3. Manter `integrations.app_store_connect: Maridas`** — ainda é útil para o `publishing.app_store_connect: auth: integration` no fim do workflow (publicação futura no TestFlight).

**4. Manter inalterado:**
- "Apply provisioning profiles to Xcode project" (`xcode-project use-profiles` lê do diretório padrão)
- "Archive (xcodebuild, Codemagic manual signing)" — `CODE_SIGN_STYLE=Manual`, `PROVISIONING_PROFILE_SPECIFIER=$CM_PROFILE_NAME`, `CODE_SIGN_IDENTITY=$DIST_SHA`
- "Export IPA"

**5. Atualizar `.lovable/plan.md`** para descrever a nova estratégia (reference names em vez de campos inválidos).

## Pré-requisitos no Codemagic (já confirmados por você)

Em **Teams → seu time → codemagic.yaml settings → Code signing identities**:

- **iOS certificates**: `.p12` salvo com Reference name = `CM_CERTIFICATE`. A senha do `.p12` é fornecida no momento do upload e fica armazenada junto — não vai no YAML.
- **iOS provisioning profiles**: `.mobileprovision` salvo com Reference name = `CM_PROVISIONING_PROFILE`, vinculado ao bundle `com.healthmedia.maridas`.

> Se a senha do `.p12` não foi informada no upload, será necessário re-uploadar o arquivo informando-a; o Codemagic não consegue instalar o cert sem ela.

## Resultado esperado

- O YAML passa na validação (sem mais "extra fields not permitted").
- O Codemagic baixa automaticamente `CM_CERTIFICATE` (com a senha salva) e `CM_PROVISIONING_PROFILE` antes dos scripts.
- O `.p12` é instalado no keychain com a private key embutida → some o erro "Cannot save Signing Certificates without certificate private key".
- `xcode-project use-profiles` aplica o profile, `CM_PROFILE_NAME` é exportado, archive e export rodam normalmente.
