## Adicionar assinatura release ao build Android

Inserir novo step **`Configure release signing`** no `codemagic.yaml` (workflow `android-release`), entre **Set Android SDK location** e **Increment version code**.

O step:
1. Injeta um bloco `signingConfigs.release` no início do `android { ... }` em `android/app/build.gradle`, lendo as variáveis `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD` que o Codemagic expõe quando `android_signing: healthmedia` está ativo.
2. Adiciona `release { signingConfig signingConfigs.release }` no bloco `buildTypes`.
3. Usa `sed -i.bak` (portátil macOS/Linux) e remove o backup.
4. Faz grep no final pra confirmar a injeção.

## Por quê
O `npx cap add android` gera um `build.gradle` sem `signingConfigs`, então o `bundleRelease` produz um AAB **não assinado** — daí o erro do Play Console "Todos os pacotes enviados precisam ser assinados". Como recriamos a pasta `android/` a cada build, a injeção precisa rodar a cada execução.