## Problema

Google Play recusou os AABs com "O código de versão 1778262501 / 1778264469 já foi usado". Esses códigos vêm da etapa `Increment version code` do workflow `android-release` no `codemagic.yaml`, que usa `date +%s` (epoch em segundos) como base e tenta consultar o Play via `google-play get-latest-build-number` para subir acima do remoto.

A consulta remota falhou silenciosamente (provavelmente porque a variável de credencial não foi detectada ou o CLI retornou erro), então o build caiu no fallback `LOCAL+1`. Como dois builds dispararam em segundos próximos e os AABs anteriores já estavam no Play, os novos códigos colidiram com os já enviados (mesmo intervalo de epoch).

## Causa raiz

1. A detecção de credencial busca `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` no env, mas o workflow declara essa credencial via `groups: [google_play]` — ela só aparece no env se o grupo expuser esse nome exato. Se o grupo expõe outro nome (ex.: `GOOGLE_PLAY_JSON_KEY`), o loop não encontra e pula a consulta.
2. Mesmo com credencial, o CLI `google-play` da Codemagic às vezes precisa do JSON gravado em arquivo (via `@FILE:` em vez de `@env:`).
3. O fallback `LOCAL+1` (epoch+1) não considera códigos já enviados ao Play em builds anteriores feitos no mesmo minuto/segundo.

## Mudanças (apenas `codemagic.yaml`, etapa `Increment version code` do `android-release`)

1. **Listar variáveis candidatas e gravar a primeira disponível em arquivo temporário** (`/tmp/gp_creds.json`), para usar `--credentials @FILE:/tmp/gp_creds.json` (mais confiável que `@env:`). Candidatas: `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`, `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_JSON_KEY`, `GCP_SA_KEY`.
2. **Logar claramente** qual variável foi escolhida (e listar as presentes via `env | grep -iE 'google|gcloud|play'` sem expor valores) para depurar caso nenhuma case.
3. **Trocar a base local** de `date +%s` para `date +%s` **+ offset de segurança grande** (ex.: somar 100000) — garante que mesmo sem consulta remota o novo código fique acima de qualquer envio recente (1778264469 → próximo build ficará ~1778370000+).
4. **Sempre tentar a consulta remota** via `google-play get-latest-build-number` com `--credentials @FILE:/tmp/gp_creds.json --package-name com.maridas.app --tracks internal alpha beta production`. Se sucesso, usar `max(REMOTE, LOCAL) + 1`.
5. **Se a consulta falhar mas houver credencial**, falhar o build com mensagem clara em vez de seguir cego — evita re-uploads colidindo.
6. **Se não houver credencial alguma**, usar somente `LOCAL` (epoch + offset) e logar aviso destacado.

## Arquivos afetados

- `codemagic.yaml` (apenas a etapa `Increment version code` do workflow `android-release`)

Nada do iOS, app, RLS ou backend muda.
