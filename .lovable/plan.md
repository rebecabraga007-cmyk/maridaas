## Diagnóstico

A captura mostra o erro real: `Uncaught Error: supabaseUrl is required` vindo do bundle JS. Isso acontece quando algum módulo importa `src/integrations/supabase/client.ts` e executa `createClient(...)` com `VITE_SUPABASE_URL` ausente.

O fallback em `main.tsx` ainda não resolve totalmente porque ele também depende das variáveis `VITE_*` existirem no bundle. Se o ambiente de build não injeta essas variáveis, qualquer import do cliente do backend continua podendo derrubar o app antes da UI renderizar.

## Plano de correção

1. **Blindar o cliente do backend contra crash fatal**
   - Não editar manualmente o arquivo gerado `src/integrations/supabase/client.ts`.
   - Criar uma camada segura separada, por exemplo `src/integrations/supabase/safeClient.ts`, que usa valores de fallback públicos e válidos quando `import.meta.env` vier vazio.
   - Exportar um `supabase` compatível para o restante do app, sem lançar erro síncrono no carregamento do módulo.

2. **Trocar imports do app para o cliente seguro**
   - Atualizar imports em páginas, hooks, componentes e integração Lovable para usar o cliente seguro.
   - Manter o arquivo gerado intacto.
   - Isso remove a principal causa da tela branca: `createClient(undefined, undefined)`.

3. **Ajustar o bootstrap visual**
   - Atualizar `src/main.tsx` para aceitar o fallback seguro de configuração e não bloquear a renderização só porque `VITE_*` não foi injetado.
   - Manter o diagnóstico visual para erros reais de render/import.
   - Evitar deixar a tela preta de diagnóstico como experiência final quando o app inicia corretamente.

4. **Validar build estável e chunks**
   - Conferir se não há `React.lazy`/imports dinâmicos quebrados restantes além do import controlado do bootstrap.
   - Garantir que o bundle não dependa de service worker/PWA para carregar.
   - Manter `vite-plugin-pwa` removido e os kill-switch workers em `/sw.js` e `/service-worker.js` por um ciclo de release.

5. **Resultado esperado**
   - O app deixa de quebrar com `supabaseUrl is required`.
   - Preview, publicado e Capacitor passam a renderizar UI em vez de tela branca.
   - Se ocorrer outro erro de produção, a tela mostra o erro real em vez de ficar silenciosa.

## Observação importante

Depois da implementação, ainda será necessário publicar/atualizar o frontend para substituir o bundle que está rodando no preview/publicado. Para Capacitor, depois disso rode `git pull`, `npm install` se necessário, `npm run build` e `npx cap sync ios/android` antes de gerar novo build nativo.