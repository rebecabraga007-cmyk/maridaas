## Problema

O Google Play rejeitou o upload com:
> O código de versão 29637699 já foi usado. Tente outro.

Esse versionCode (`29637699`) corresponde a `epoch / 60` no momento do build anterior — ou seja, o AAB que você subiu manualmente já queimou esse número. O bump automático que adicionamos *deveria* ter detectado isso via `google-play get-latest-build-number`, mas não detectou. Há dois motivos prováveis:

1. **Nome da variável de credenciais errado.** No bloco `publishing`, o Codemagic usa `$GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` (do grupo `google_play`). Mas a CLI `google-play` espera receber as credenciais explicitamente via `--credentials @env:NOME`. Se a variável existir com **outro nome** no grupo (ex: `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS`, como apareceu no log de publishing anterior), o `if [ -n "$GCLOUD_SERVICE_ACCOUNT_CREDENTIALS" ]` falha silenciosamente e cai no fallback local — gerando o mesmo `epoch/60`.

2. **`get-latest-build-number` não cobre rascunhos/archived.** Ele só olha tracks ativos. Um AAB enviado manualmente que ficou em rascunho (sem release publicada) pode não aparecer. O Google Play, porém, **bloqueia reuso de qualquer versionCode já visto**, mesmo de rascunhos/arquivados.

## Plano

Reforçar a etapa `Increment version code` no `codemagic.yaml` (workflow `android-release`) para:

### 1. Detectar a variável de credenciais automaticamente

Tentar várias variáveis comuns na ordem:
- `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

Usar a primeira que estiver definida e não-vazia, e logar qual foi escolhida (sem imprimir o conteúdo).

### 2. Consultar todos os tracks + edições em rascunho via API direta

Em vez de depender só do `google-play get-latest-build-number` (que pode pular rascunhos/archived), fazer uma chamada Python direta à Google Play Developer API:

```text
1. Trocar a service-account JSON por um access token OAuth2 (escopo androidpublisher)
2. POST /androidpublisher/v3/applications/{pkg}/edits  → cria edit
3. GET /androidpublisher/v3/applications/{pkg}/edits/{editId}/bundles
   → lista TODOS os bundles já enviados (inclui rascunhos e archived)
4. Pega max(versionCode) sobre todos os bundles
5. DELETE do edit (cleanup)
```

Isso captura inclusive o `29637699` que ficou em rascunho.

### 3. Manter fallback robusto

Se nada funcionar (sem credenciais, sem rede, API falha), em vez de usar `epoch/60` (que pode colidir de novo), usar:

```text
VERSION_CODE = max(epoch/60, valor salvo em arquivo de cache local) + 1
```

Sem cache local persistente entre builds (Codemagic não tem), o fallback fica `epoch/60` mesmo, mas com aviso explícito no log de que pode colidir.

### 4. Logar o resultado claramente

```
Local candidate: 29637712
Remote max (all tracks + drafts): 29637699
Final versionCode: 29637712  (local > remote, no bump needed)
```

ou

```
Local candidate: 29637700
Remote max (all tracks + drafts): 29637712
Final versionCode: 29637713  (bumped above remote)
```

## Detalhes técnicos

Arquivo único alterado: `codemagic.yaml`, etapa `Increment version code` do workflow `android-release` (linhas ~378-411).

A consulta à Google Play Developer API será em Python inline (já disponível no runner mac do Codemagic), usando apenas `urllib` + `json` + a lib `cryptography`/`pyjwt` para assinar o JWT do service account. Para evitar dependência extra, usar `gcloud auth print-access-token` se disponível, ou instalar `pyjwt` rapidamente via `pip install --quiet pyjwt cryptography` no início da etapa.

Não mudo nada em iOS, gradle, signing, nem na publicação (`publishing.google_play` continua com `submit_as_draft: true`).

## Alternativa mais simples (se preferir)

Em vez de consultar a API, usar timestamp em **segundos** em vez de minutos:

```bash
VERSION_CODE=$(date +%s)
```

Isso dá ~1.7 bilhão hoje — bem dentro do limite do Google Play (`2_100_000_000`) e cresce monotonicamente sem nunca colidir, dispensando qualquer consulta remota. Custo: o número fica grande (~10 dígitos) mas isso não tem impacto prático nenhum.

**Recomendo essa alternativa** — é uma linha, zero dependência de credenciais, zero chance de colisão. Posso implementar essa em vez da consulta à API se você preferir.
