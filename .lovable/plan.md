## Objetivo
Eliminar risco de colisão no `versionCode` Android e tornar o artifact publicado totalmente rastreável no pipeline.

## O que encontrei
- O workflow Android já tem:
  - rebuild limpo do Android
  - injeção de `versionCode` no `build.gradle`
  - validação do `.aab` com `bundletool`
  - falha em divergência
- Hoje o algoritmo ainda é complexo e arriscado:
  - usa base alta (`2050000000`)
  - usa timestamp em slots
  - combina fallback por build number
  - consulta o maior código remoto na Play
- Isso mantém o valor perigosamente perto do teto de `int32` do Android e aumenta chance de colisão, corrida entre builds e comportamento inconsistente.

## Plano
1. **Trocar a estratégia de geração por uma sequência monotônica simples**
   - Remover a lógica baseada em timestamp alto, `HIGH_BASE_VERSION_CODE`, `TIME_SLOT`, `KNOWN_USED_FLOOR` e incremento a partir de cache remoto.
   - Passar a usar `BUILD_NUMBER`/`CM_BUILD_NUMBER` como fonte primária e obrigatória do `versionCode`.
   - Falhar o build se nenhum número sequencial confiável estiver disponível.

2. **Endurecer a validação de faixa e tipo**
   - Validar explicitamente que o valor:
     - é numérico inteiro
     - é maior que zero
     - é menor que `2100000000`
   - Garantir que o Gradle use exatamente esse valor vindo do ambiente, sem recomputar com outra regra paralela.

3. **Remover fontes de não determinismo**
   - Eliminar dependência de:
     - timestamp gigante
     - cast implícito entre `long` e `int`
     - consulta do maior `versionCode` remoto para decidir o local
     - normalização/fallbacks que possam gerar valores diferentes entre shell e Gradle
   - Deixar uma única fonte de verdade para o `versionCode` do build.

4. **Adicionar rastreabilidade explícita do artifact final**
   - Logar de forma exata e fácil de buscar:
     - `FINAL_VERSION_CODE=`
     - `AAB_OUTPUT_PATH=`
     - `APPLICATION_ID=`
     - opcionalmente `AAB_SHA256=` para conferir se o arquivo baixado é o mesmo do upload
   - Manter a validação com `bundletool`, comparando o valor esperado com o presente dentro do `.aab` final.

5. **Blindar contra artifact incorreto**
   - Confirmar que só exista **um** `.aab` final no diretório esperado.
   - Fazer o passo de publicação usar exatamente o artifact recém-validado.
   - Se houver mais de um `.aab`, falhar o pipeline e listar os caminhos encontrados.

6. **Revisar o workflow quanto a concorrência e publicação**
   - Confirmar que há apenas um workflow Android publicando para a Play.
   - Confirmar package id fixo (`com.maridas.app`) e track correto.
   - Evitar lógica que dependa de estado remoto para incrementar código durante builds paralelos.

## Resultado esperado
- `versionCode` sempre crescente
- abaixo do limite Android
- sem dependência de timestamp alto
- sem colisão por cache remoto
- sem divergência entre valor calculado e valor empacotado
- logs suficientes para provar qual `.aab` foi gerado e qual código ele contém

## Detalhes técnicos
- Arquivo alvo: `codemagic.yaml`
- Mudança principal:
  - substituir o algoritmo atual por leitura direta de `CM_BUILD_NUMBER`/`BUILD_NUMBER`
  - propagar esse valor para o patch do `android/app/build.gradle`
  - manter validação final via `bundletool`
- Logs finais esperados no build:
  - `FINAL_VERSION_CODE=...`
  - `AAB_OUTPUT_PATH=...`
  - `APPLICATION_ID=com.maridas.app`
  - `AAB_VERSION_CODE=...`
  - `AAB_SHA256=...`