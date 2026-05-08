## Problema

O upload no TestFlight funcionou (build `fb6c4e91...` processado e enviado para Beta Review). Mas a submissão simultânea para a App Store falhou:

> 409: The specified pre-release build could not be added.

Causa: já existe uma App Store Version **`1.1.1`** no estado `WAITING_FOR_REVIEW`. Apple não permite trocar o build de uma versão nesse estado — só permite em estados editáveis (`PREPARE_FOR_SUBMISSION`, `DEVELOPER_REJECTED`, `REJECTED`, `METADATA_REJECTED`, `INVALID_BINARY`).

A etapa `Increment build & marketing version` no `codemagic.yaml` (workflow `ios-release`) já tenta detectar a última versão remota com `app-store-connect apps app-store-versions`, mas:
1. O comando lista **todas** as versões (inclusive descontinuadas/antigas) e o `tail -n1` por sort numérico pode pegar uma errada se a paginação cortar, ou
2. A versão `1.1.1` foi gerada *neste mesmo build* (TestFlight criou a App Store Version automaticamente?) — não, isso não acontece. Mais provável: o build anterior gerou `1.1.1`, o `app-store-connect` não retornou JSON parseável (ou veio vazio por falta de credencial CLI no momento), então caiu para `LOCAL_PATCH=0` → bumped para `1.1.1` de novo.

## Plano

Duas correções no `codemagic.yaml`, workflow `ios-release`:

### 1. Tornar o bump da marketing version à prova de falha

Na etapa `Increment build & marketing version` (linhas ~150-205):

- Trocar o parsing frágil (`grep -Eo '"versionString"...'`) por `app-store-connect apps app-store-versions "$APPLE_APP_ID" --json | python3 -c "..."` que extrai todas as `versionString` de forma robusta.
- Logar **explicitamente** quantas versões foram encontradas e quais estados elas têm. Se 0, falhar com mensagem clara em vez de continuar com `REMOTE_PATCH=0`.
- Aplicar `+1` mesmo quando o `LOCAL_PATCH` empata com o `REMOTE_PATCH`, garantindo `NEW_PATCH > max(local, remote)` sempre.
- Adicionar fallback robusto: se a CLI falhar **e** já houver um build anterior conhecido, usar `epoch_minutes_truncado_para_3_digitos` como patch (ex: `1.1.42`) em vez de `1.1.1`.

### 2. Desacoplar TestFlight da submissão à App Store

O bloco `publishing` atual:
```yaml
app_store_connect:
  submit_to_testflight: true
  submit_to_app_store: true
```

Faz com que **uma única falha na App Store** (mesmo com TestFlight OK) marque o build inteiro como falho. Como você precisa do TestFlight imediatamente e a App Store só pode aceitar versões com binário novo + estado editável:

- Manter `submit_to_testflight: true` (essencial para testers).
- Mudar `submit_to_app_store` para **`false`** por padrão.
- Criar um **segundo workflow `ios-appstore-release`** (ou flag manual) que só roda quando você quer submeter à App Store. Esse workflow força um bump de marketing version *antes* do build (lendo o estado atual da versão remota e abortando cedo se ela estiver `WAITING_FOR_REVIEW`).

Alternativa mais simples (sem segundo workflow): manter `submit_to_app_store: true` mas adicionar uma etapa **pré-build** que aborta o workflow com mensagem amigável se a App Store Version atual estiver `WAITING_FOR_REVIEW` / `IN_REVIEW` / `PENDING_DEVELOPER_RELEASE` — assim você não desperdiça um build inteiro para descobrir que Apple bloqueou.

## Detalhes técnicos

Arquivo único alterado: `codemagic.yaml`.

- Etapa `Increment build & marketing version`: parsing JSON com `python3` (já disponível no runner mac), `+1` garantido sobre `max(local, remoto)`, log explícito de versões+estados.
- Bloco `publishing.app_store_connect`: `submit_to_app_store: false` + opcional segundo workflow ou guard pré-build.

Nada muda em Android, signing, gradle, Capacitor.

## Recomendação

Vou implementar **ambas** as correções (parsing robusto + desacoplar App Store do TestFlight com guard pré-build). Você confirma que quer manter o submit automático para App Store quando o estado for editável, ou prefere submeter manualmente pelo App Store Connect e o workflow só faz TestFlight?

## Pergunta rápida

Qual destes comportamentos você quer no `ios-release`?

1. **Só TestFlight automático** — App Store você submete manualmente pelo App Store Connect quando quiser. (mais seguro, zero falhas espúrias)
2. **TestFlight + App Store automáticos, com guard** — workflow detecta `WAITING_FOR_REVIEW` antes de buildar e aborta com mensagem clara, evitando o erro 409. (mais automatizado)
3. **Dois workflows separados** — `ios-testflight` (rápido, frequente) e `ios-appstore` (manual, raro).

Me responde 1, 2 ou 3 e eu implemento.