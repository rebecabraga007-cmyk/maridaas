## Alinhar applicationId Android com Play Console

**Editar `capacitor.config.ts`:**
- `appId: 'app.lovable.ec7435214cbf4c3ea2cde2adacbf5879'` → `appId: 'com.maridas.app'`

## Por quê
O app "Maridas" no Play Console usa package `com.maridas.app`. O `cap add android` lê o `appId` para gerar o `applicationId` no `build.gradle`, então essa única mudança é suficiente.

## Impacto
- **Android:** passa a usar `com.maridas.app`. iOS não muda (usa `BUNDLE_ID` definido no `codemagic.yaml`).
- **OAuth Google/Firebase:** se você tem SHA registrado pra outro package, vai precisar reconfigurar pro novo. (Não é o caso agora — auth roda via web/Supabase.)

## Ação manual depois do build
Primeiro AAB precisa ser enviado **manualmente** no Play Console (Maridas → Testes Internos → Criar versão → upload do .aab dos artefatos do Codemagic). Próximos builds vão publicar automaticamente.