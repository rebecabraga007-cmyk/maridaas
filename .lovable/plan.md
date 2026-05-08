## Problema

O Google Play rejeitou o `versionCode` 1779267389. A checagem remota via `google-play` CLI provavelmente está falhando (ou retornando um valor desatualizado), e o cálculo local `epoch + 1000000` caiu em uma faixa já usada. Precisamos de um fallback que tente vários candidatos até encontrar um aceito pelo Google Play, ou que pelo menos suba o piso local de forma persistente.

## Plano

Editar apenas o passo `Increment version code` em `codemagic.yaml`:

1. **Subir o piso local** de `epoch + 1000000` para `epoch + 10000000`, escapando imediatamente da faixa rejeitada (1779267389).

2. **Adicionar piso conhecido**: definir `KNOWN_USED_FLOOR=1779267389` e garantir que o `LOCAL` seja sempre `> KNOWN_USED_FLOOR`. Se `epoch + 10000000` ainda for menor (não será hoje, mas blindagem futura), usar `KNOWN_USED_FLOOR + 1`.

3. **Fallback incremental quando a checagem remota falhar ou estiver ausente**:
   - Tentar até 50 candidatos consecutivos (`CANDIDATE = LOCAL + i`).
   - Para cada candidato, se o `google-play` CLI estiver disponível e as credenciais válidas, perguntar `get-latest-build-number` e comparar — se o candidato for `> REMOTE`, aceitar.
   - Se o CLI não estiver disponível ou continuar falhando, simplesmente avançar `LOCAL` em incrementos de 1000 e usar o último candidato (não há como validar sem API).

4. **Quando a checagem remota funcionar normalmente** (caminho atual): manter `max(REMOTE + 1, LOCAL)` — sem mudanças.

5. **Logs claros** mostrando: piso conhecido, LOCAL inicial, REMOTE (se obtido), número de tentativas no fallback, e `versionCode` final aplicado.

6. **Não tocar em nenhum outro arquivo** — só `codemagic.yaml`.

## Resultado esperado

O próximo build:
- Gera um `versionCode` ≥ `1779267389 + 1` mesmo se a API do Play falhar.
- Quando a API responde, usa `REMOTE + 1` como hoje.
- Se ainda houver colisão (caso raro de race), o publish falha — mas o piso elevado torna isso extremamente improvável.
