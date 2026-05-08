## Problema

O upload do build para o App Store Connect funcionou, mas o envio automático para o TestFlight falhou com:

> The build is missing export compliance.

Isso acontece porque o `Info.plist` do app não declara se o app usa criptografia não-isenta. Sem essa declaração, a Apple bloqueia o envio para revisão até que alguém preencha manualmente no App Store Connect.

Como o Maridas usa apenas HTTPS padrão (Supabase, Stripe, OneSignal) e não implementa criptografia proprietária, podemos declarar `ITSAppUsesNonExemptEncryption = false` e o build passa direto, sem intervenção manual a cada release.

## Plano

Atualizar o workflow `ios-release` no `codemagic.yaml` para injetar a chave de export compliance no `Info.plist` antes do archive.

### Mudança em `codemagic.yaml` (workflow `ios-release`)

No step **"Increment build & marketing version"** (que já mexe no `Info.plist` via `PlistBuddy`), adicionar duas linhas que garantem a presença da chave:

```bash
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$PLIST"
```

Isso:
- Adiciona a chave se não existir
- Atualiza para `false` se já existir
- É idempotente entre builds

### Resultado esperado

- Próximo build sobe e é submetido ao TestFlight automaticamente, sem o erro 422
- Não requer nenhuma ação manual no App Store Connect a cada versão
- Sem mudanças no código React/Capacitor

### Observação

Essa declaração (`false`) é correta apenas porque o app usa exclusivamente criptografia padrão do sistema (HTTPS/TLS via WebView, bibliotecas Apple). Se no futuro for adicionada criptografia customizada (ex: E2EE de mensagens com algoritmo próprio), essa flag precisará virar `true` e exigirá documentação adicional para a Apple.
