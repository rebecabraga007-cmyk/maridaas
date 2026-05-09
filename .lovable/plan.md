## Objetivo

Substituir o algoritmo atual de `versionCode` Android (timestamp + base alta `2050000000` + cache remoto da Play + closure Groovy `resolveGeneratedVersionCode`) por uma estratégia simples e monotônica baseada em `CM_BUILD_NUMBER` (= `$BUILD_NUMBER` no Codemagic), com valor literal injetado no Gradle, logs explícitos e validação do AAB real antes do upload.

## Mudanças no `codemagic.yaml` — workflow `android-release`

### 1. Step "Prepare Android versionCode" (linhas ~458–639) — reescrita completa

Remover:
- `HIGH_BASE_VERSION_CODE=2050000000`, `EPOCH_BASE_SECONDS`, `TIME_SLOT`, cálculo timestamp.
- Toda a integração `google-play get-latest-build-number` (CRED_VAR, normalize_creds.py, REMOTE).
- Closure Groovy `resolveGeneratedVersionCode` injetada no `build.gradle`.

Manter / adicionar:
- Piso conhecido como variável: `KNOWN_USED_FLOOR=2057099000` (acima do `2057098943` já enviado e rejeitado).
- Leitura estrita de `CM_BUILD_NUMBER`:
  ```
  if ! echo "$CM_BUILD_NUMBER" | grep -Eq '^[0-9]+$' || [ "$CM_BUILD_NUMBER" -le 0 ]; then
    echo "ERROR: CM_BUILD_NUMBER ausente — não é possível gerar versionCode monotônico"
    exit 1
  fi
  ```
- Cálculo:
  ```
  VERSION_CODE=$(( KNOWN_USED_FLOOR + CM_BUILD_NUMBER ))
  ```
- Sanidade: `> KNOWN_USED_FLOOR`, `< 2100000000`, inteiro positivo, falha explícita em qualquer violação.
- Persistência:
  ```
  echo "GENERATED_VERSION_CODE=$VERSION_CODE" >> $CM_ENV
  printf '%s' "$VERSION_CODE" > /tmp/android_version_code.txt
  ```
- Patch direto no `android/app/build.gradle` substituindo a linha `versionCode <n>` por **valor literal** (sem closures, sem `System.getenv`, sem `System.currentTimeMillis`):
  ```
  versionCode 2057099XXX
  ```
  Gradle não recalcula nada. Eliminamos a divergência shell↔AAB.
- Logs obrigatórios no fim do step:
  ```
  FINAL_VERSION_CODE=<n>
  CM_BUILD_NUMBER=<n>
  KNOWN_USED_FLOOR=<n>
  APPLICATION_ID=com.maridas.app
  ```

### 2. Step "Build AAB (release)" (linhas ~640–685) — reforço de auditoria

- Manter `gradlew clean :app:bundleRelease --no-build-cache --rerun-tasks`.
- Manter validação `bundletool dump manifest` comparando `versionCode` do AAB com `GENERATED_VERSION_CODE`.
- Adicionar leitura e validação de `applicationId` via `bundletool dump manifest --xpath '/manifest/@package'`, falhar se ≠ `com.maridas.app`.
- Adicionar logs finais:
  ```
  FINAL_AAB_PATH=<caminho absoluto>
  FINAL_AAB_SHA256=<sha256sum do .aab>
  FINAL_AAB_VERSION_CODE=<n>
  FINAL_AAB_APPLICATION_ID=<n>
  FINAL_AAB_SIZE=<bytes>
  ```

### 3. Bloco `artifacts:` (linha 686-688) — restringir

Reduzir a um único glob explícito do diretório oficial desta build:
```
artifacts:
  - android/app/build/outputs/bundle/release/*.aab
```
Remover `**/*.apk` e o glob amplo `**/*.aab` para impedir que um artefato antigo de outro caminho seja publicado.

## Ações fora do pipeline (necessárias pelo usuário)

Mesmo com o pipeline correto, "versionCode já usado" pode persistir por estado no Play Console:

1. Play Console → **App bundle explorer**: identificar o maior `versionCode` registrado em qualquer track (Internal, Closed, Open, Production) e em releases descartadas/rejeitadas.
2. Se for maior que `2057099000`, atualizar `KNOWN_USED_FLOOR` no `codemagic.yaml` para esse valor.
3. Em todos os tracks: **Discard release** de qualquer draft pendente.
4. Confirmar que apenas um workflow Android está habilitado no Codemagic (sem builds paralelos disputando `CM_BUILD_NUMBER`).

## Detalhes técnicos

- `CM_BUILD_NUMBER` é estritamente monotônico por workflow no Codemagic — equivale ao `$BUILD_NUMBER` solicitado.
- Faixa resultante com `KNOWN_USED_FLOOR=2057099000` e builds <100k: `versionCode` entre `2057099001` e `~2057199000`. Folga de ~43 milhões até o teto Android `2100000000`.
- Valor literal no Gradle elimina overflow `long → int` e qualquer recomputação dinâmica.
- `--no-build-cache --rerun-tasks` já garante zero reaproveitamento.
- Hash SHA256 nos logs permite confirmar visualmente que o `.aab` publicado pela Play é o gerado neste run.

## Fora de escopo

- Workflow iOS (já validado via `CFBundleVersion` no IPA).
- Credenciais, signing config, tracks de publicação.
- Código frontend.