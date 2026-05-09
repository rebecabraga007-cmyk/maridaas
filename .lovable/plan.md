## Problema

`CM_BUILD_NUMBER` veio vazio no runner Codemagic. Em Codemagic, a variável padrão exposta a scripts é `BUILD_NUMBER` (e `PROJECT_BUILD_NUMBER`); `CM_BUILD_NUMBER` nem sempre está definida dependendo do tipo de workflow/conta.

## Correção

Arquivo: `codemagic.yaml`, step `Prepare Android versionCode`.

Trocar a leitura estrita de `CM_BUILD_NUMBER` por uma busca ordenada em variáveis equivalentes, todas estritamente monotônicas no Codemagic:

1. `CM_BUILD_NUMBER`
2. `BUILD_NUMBER` (padrão Codemagic)
3. `PROJECT_BUILD_NUMBER` (padrão Codemagic)
4. `FCI_BUILD_NUMBER` (legado Codemagic)

Lógica:

```
BUILD_NUM=""
BUILD_SOURCE=""
for v in CM_BUILD_NUMBER BUILD_NUMBER PROJECT_BUILD_NUMBER FCI_BUILD_NUMBER; do
  VAL=$(printenv "$v" 2>/dev/null || true)
  if echo "$VAL" | grep -Eq '^[0-9]+$' && [ "$VAL" -gt 0 ]; then
    BUILD_NUM="$VAL"
    BUILD_SOURCE="$v"
    break
  fi
done

if [ -z "$BUILD_NUM" ]; then
  echo "ERROR: nenhum build number monotônico encontrado nas variáveis padrão do Codemagic"
  echo "       Verificadas: CM_BUILD_NUMBER, BUILD_NUMBER, PROJECT_BUILD_NUMBER, FCI_BUILD_NUMBER"
  env | grep -iE 'build.?number' || true
  exit 1
fi

VERSION_CODE=$(( KNOWN_USED_FLOOR + BUILD_NUM ))
```

Atualizar o log final para incluir `BUILD_SOURCE`:

```
FINAL_VERSION_CODE=<n>
BUILD_NUMBER_SOURCE=<nome da var>
BUILD_NUMBER_VALUE=<n>
KNOWN_USED_FLOOR=<n>
APPLICATION_ID=com.maridas.app
```

Resto do step (validação de range, patch literal no `build.gradle`, persistência em `$CM_ENV` e `/tmp/android_version_code.txt`) permanece igual.

## Fora de escopo

- Step "Build AAB (release)" — sem mudanças, validação `bundletool` continua igual.
- Workflow iOS — sem mudanças.