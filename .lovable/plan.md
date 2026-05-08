Plano para corrigir definitivamente o `versionCode` Android:

1. Atualizar somente o passo `Increment version code` em `codemagic.yaml`.

2. Abandonar a fórmula atual `epoch + 100000 + jitter`, porque ela continua perto da faixa já usada/rejeitada.

3. Gerar o novo `versionCode` em uma faixa bem acima da atual, por exemplo:
   - `KNOWN_USED_FLOOR=1788379270`
   - `BASE_VERSION_CODE=2000000000`
   - usar `CM_BUILD_NUMBER`/`BUILD_NUMBER` quando disponível para gerar `2000000000 + buildNumber`
   - se o número calculado não for maior que o último usado, incrementar localmente até ultrapassar o piso.

4. Manter a checagem remota do Google Play:
   - se funcionar, usar `max(remote + 1, localCandidate)`
   - se falhar, usar o candidato local alto, nunca abaixo do piso conhecido.

5. Adicionar proteção contra limite Android:
   - `versionCode` deve ficar abaixo de `2100000000` para evitar problemas com o limite inteiro do Android/Google Play.

6. Preservar `versionName` separado e intacto, alterando apenas `versionCode` em `android/app/build.gradle` antes do build `.aab`.

Resultado esperado: o próximo build deve sair em uma faixa como `2000000001+`, muito acima de `1788379270`, evitando reutilização dos códigos anteriores.