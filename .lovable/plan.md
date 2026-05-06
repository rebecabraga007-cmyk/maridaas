## Diagnóstico

O erro atual acontece no passo:

```text
Fetch signing files via App Store Connect API (auto-create cert)
Cannot save Signing Certificates without certificate private key
```

A causa provável é que o comando `app-store-connect fetch-signing-files --create` não gera uma private key automaticamente sem receber `--certificate-key`. A documentação do Codemagic CLI indica que `--certificate-key` é usado junto com `--create`, e sem isso ele também pode tentar reutilizar/fazer download de um certificado existente no portal Apple sem a private key correspondente.

## Plano de correção

1. **Gerar uma private key temporária na VM do Codemagic**
   - Antes de chamar `app-store-connect fetch-signing-files`, criar um arquivo `.key` local na VM usando `openssl genrsa`.
   - Essa private key existe apenas durante o build e será usada para criar o certificado Apple Distribution.

2. **Passar a private key explicitamente ao Codemagic CLI**
   - Alterar o comando para:

   ```bash
   app-store-connect fetch-signing-files "$BUNDLE_ID" \
     --type IOS_APP_STORE \
     --create \
     --certificate-key "@file:$CERT_KEY_PATH"
   ```

   - Assim o certificado criado no Apple Developer Portal terá uma private key correspondente disponível na VM, permitindo salvar/importar o `.p12`.

3. **Forçar diretórios compatíveis com o `keychain add-certificates`**
   - Configurar `--certificates-dir "$HOME/Library/MobileDevice/Certificates"` e `--profiles-dir "$HOME/Library/MobileDevice/Provisioning Profiles"` para manter compatibilidade com o passo seguinte.

4. **Melhorar validação e logs do signing**
   - Criar os diretórios antes do fetch.
   - Listar certificados/profiles baixados.
   - Manter a validação de que existe ao menos uma identidade `Apple Distribution` no keychain.

5. **Remover/ajustar a afirmação incorreta no plano interno**
   - Atualizar `.lovable/plan.md` para não dizer que o CLI gera a private key sozinho; ele precisa receber uma private key via `--certificate-key`.

## Pré-requisito manual antes de rodar de novo

No Apple Developer Portal, revogue/remova certificados `Apple Distribution` antigos/sem private key para evitar que o CLI tente reutilizar um certificado que a VM não consegue salvar. O ideal é deixar espaço para ele criar um novo certificado válido com a key gerada no build.

Também recomendo revogar a App Store Connect API Key compartilhada no chat e atualizar a integração `Maridas` no Codemagic com uma chave nova.