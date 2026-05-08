## Problema

O Google Play rejeitou o novo AAB com:
> O código de versão **1778262501** já foi usado. Tente outro.

Esse número é exatamente `date +%s` (epoch em segundos) — ou seja, a mudança que fizemos para usar epoch-segundos funcionou, mas o build anterior já queimou esse valor e o novo build rodou no mesmo segundo (ou antes). Como `epoch` só cresce ~1 por segundo, dois builds disparados muito próximos podem colidir, e qualquer AAB já enviado manualmente "trava" aquele número para sempre.

A solução epoch-segundos sozinha não basta. Precisamos garantir que o `versionCode` seja **estritamente maior** que qualquer um já enviado ao Google Play (incluindo rascunhos).

## Plano

Alterar **somente** a etapa `Increment version code` do workflow `android-release` no `codemagic.yaml` para:

### 1. Calcular candidato local
```
LOCAL=$(date +%s)
```

### 2. Consultar o maior versionCode já existente no Google Play

Usar a CLI `google-play` (já disponível no runner mac do Codemagic) com a credencial do grupo `google_play`. Tentar nomes comuns na ordem:
- `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS`

Comando:
```
google-play get-latest-build-number \
  --credentials @env:<VAR_DETECTADA> \
  --package-name com.maridas.app \
  --tracks internal alpha beta production
```

### 3. Escolher o final
```
FINAL = max(LOCAL, REMOTE) + 1   (se REMOTE >= LOCAL)
FINAL = LOCAL                     (se LOCAL > REMOTE)
```
O `+1` quando há empate/conflito garante que nunca colidimos com um número já visto pelo Play (inclusive rascunhos enviados manualmente — porque mesmo que `get-latest-build-number` não enxergue o rascunho, o próximo build natural já estará alguns segundos à frente, e se vier do mesmo segundo de um upload manual o `+1` resolve).

### 4. Fallback robusto

Se a credencial não existir ou a CLI falhar:
- Logar aviso explícito.
- Usar `LOCAL + 1` (não só `LOCAL`) — pequeno seguro contra colisão com o build imediatamente anterior.

### 5. Logar tudo

```
Local candidate: 1778262640
Remote latest:   1778262501
Final versionCode: 1778262640  (local > remote)
```

## Arquivos alterados

- `codemagic.yaml` — apenas a etapa `Increment version code` (linhas ~386-399). Nada mais muda (iOS, signing, publish, gradle continuam intactos).

## Por que não só "epoch + offset fixo"

Um offset fixo (ex: `epoch + 1000`) resolveria o caso atual mas não cobre o cenário em que um humano sobe um AAB manual com versionCode arbitrário. A consulta remota é a única forma confiável de descobrir o teto real.

## Alternativa mais simples (se preferir)

Se você não quiser depender de credenciais Google Play durante o build:
```
VERSION_CODE=$(($(date +%s) + 86400))
```
Adicionar 1 dia (86400) ao epoch garante que o número fique sempre à frente de qualquer build anterior em ≥1 dia. Bem dentro do limite (~1.78B + 86400 ≪ 2.1B). Custo zero, sem chamada de rede. Posso implementar essa em vez da consulta à API se preferir.

**Recomendação:** ir com a consulta à API (mais robusto a longo prazo). Me confirma e eu implemento.