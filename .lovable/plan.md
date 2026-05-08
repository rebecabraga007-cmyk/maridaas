## Plano

Corrigir a etapa `Increment version code` do workflow Android para passar as credenciais ao `google-play` CLI no formato que ele realmente aceita.

## Diagnóstico

O erro atual mostra que `google-play get-latest-build-number --credentials` não aceita `@FILE:/tmp/gp_creds.json`; ele está interpretando esse texto como JSON literal e falha com:

```text
argument --credentials: Provided value is not a valid JSON
```

Ou seja: a variável `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` está sendo detectada, mas o formato enviado ao CLI está errado.

## Mudanças propostas

1. Atualizar apenas `codemagic.yaml`, na etapa `Increment version code` do workflow Android.
2. Remover o uso de `--credentials "@FILE:/tmp/gp_creds.json"`.
3. Normalizar o conteúdo da variável de credencial antes do uso:
   - aceitar JSON direto;
   - aceitar JSON com quebras de linha escapadas (`\n`);
   - validar com `python3 -m json.tool` antes de chamar o CLI.
4. Chamar o CLI com o JSON literal válido:

```bash
google-play get-latest-build-number \
  --credentials "$CRED_JSON_NORMALIZED" \
  --package-name "$ANDROID_APP_ID" \
  --tracks internal alpha beta production
```

5. Se o JSON for inválido, falhar com mensagem clara orientando a recriar a variável `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` como o JSON completo da service account.
6. Manter a proteção já adicionada:
   - `LOCAL=$(date +%s + 100000)`;
   - se a consulta remota funcionar, usar `max(REMOTE + 1, LOCAL)`;
   - se credenciais existem mas o CLI falha, parar o build para evitar novo upload com `versionCode` conflitante.

## Arquivos afetados

- `codemagic.yaml`
- `.lovable/plan.md` será atualizado para refletir a causa real e a correção aplicada.