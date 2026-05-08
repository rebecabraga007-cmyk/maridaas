## Diagnóstico

O erro do Codemagic é o bug conhecido do npm com dependências opcionais do Rollup: o `package-lock.json` foi gerado em outro SO/arquitetura e não contém o pacote nativo `@rollup/rollup-darwin-arm64`. Quando o Codemagic roda `npm ci`, o lockfile não baixa o binário nativo necessário no macOS Apple Silicon, e o Vite quebra no build.

## Plano de correção

1. **Forçar reinstalação limpa antes do build no Codemagic**
   - No workflow `ios-release`, alterar o passo "Install dependencies" para apagar `node_modules` e `package-lock.json` e rodar `npm install` (em vez de `npm ci`). Isso faz o npm baixar o binário nativo correto da arquitetura da máquina de build.
   - Aplicar o mesmo padrão no workflow `android-release` por consistência (evita o mesmo bug ao mudar de runner).

2. **Não tocar em código de aplicação**
   - O problema é exclusivamente de pipeline/lockfile. Nada em `src/` precisa ser alterado.
   - Manter `package.json` e demais arquivos como estão.

3. **Resultado esperado**
   - O `vite build` passa a rodar normalmente no Codemagic em macOS arm64 e em Linux Android.
   - O pipeline iOS/Android volta a gerar IPA/AAB sem o erro `Cannot find module @rollup/rollup-darwin-arm64`.