## Problema

O `versionCode` continua colidindo (agora 1788279146) porque:

- `LOCAL = date +%s + BUILD_OFFSET`, onde `BUILD_OFFSET` são só os **últimos 3 dígitos** do CM_BUILD_ID (0–999).
- O epoch atual está em `~1788279146`. Então cada novo build gera um número quase igual ao anterior (diferença de poucos segundos), e o offset pequeno não ajuda.
- O `KNOWN_USED_FLOOR=1788279145` ficou exatamente 1 abaixo do código que acabou de ser rejeitado, então o fallback gera `floor+1 = 1788279146` — já usado.
- A chamada remota ao Google Play continua falhando (sem credencial válida ou CLI), então sempre caímos no LOCAL.

## Correção proposta em `codemagic.yaml` (passo "Increment version code")

1. **Subir o floor** para `1788279200` (bem acima do último rejeitado), garantindo escape imediato da faixa queimada.
2. **Trocar a estratégia de geração** para algo monotonicamente crescente e com gap grande entre builds:
   - `EPOCH=$(date +%s)`
   - `LOCAL=$(( EPOCH * 2 ))` (dobra o epoch → cada segundo vira +2, e o resultado fica muito acima de qualquer versionCode já enviado, dando margem permanente).
   - Ainda aplicar `LOCAL=max(LOCAL, KNOWN_USED_FLOOR + 1)`.
3. **Adicionar margem fixa por build** somando `RANDOM % 500 + 100` ao final, para que dois builds disparados no mesmo segundo não colidam.
4. **Manter** a checagem remota Google Play: se responder, `VERSION_CODE = max(REMOTE + 1, LOCAL)`. Se falhar, usar `LOCAL` direto (já garantidamente acima do floor).
5. **Não mexer** em `versionName` (continua independente, vindo do build.gradle nativo).
6. **Logar claramente** EPOCH, LOCAL calculado, REMOTE (ou WARN), e VERSION_CODE final, para diagnóstico futuro.

Limite Android: `versionCode` é int 32-bit (máx `2147483647`). Com `epoch*2 ≈ 3.5 bi` em 2026 estouraríamos — então na verdade vou usar **`LOCAL = EPOCH + 100000`** (gap maior que o atual `+ últimos 3 dígitos do build id`) e confiar no floor bump como salto inicial. Isso mantém crescimento ~1/segundo + 100k de cabeça, e nunca estoura int32 antes de ~2038.

### Resultado esperado

Próximo build gera `versionCode ≥ 1788279200 + 100000 ≈ 1788379xxx`, bem acima de `1788279146`, e cada build subsequente é estritamente maior.

### Arquivos alterados

- `codemagic.yaml` (somente o passo "Increment version code")
