## Diagnóstico

A tela branca em https://maridaas.lovable.app é causada por um erro JavaScript no carregamento do app:

```
Uncaught Error: supabaseUrl is required.
  at .../assets/index-CP8TdlsP.js
```

O bundle JS publicado (`index-CP8TdlsP.js`) foi gerado **sem** as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Como `src/integrations/supabase/client.ts` lê esses valores via `import.meta.env.*`, o `createClient` recebe `undefined` e lança erro logo na inicialização — antes de qualquer componente React conseguir renderizar. Resultado: `<div id="root">` permanece vazio.

A `.env` no projeto está correta (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` presentes), e o **preview** (`id-preview--…lovable.app`) funciona porque é construído com essas variáveis. O build publicado, porém, foi feito antes do `.env` estar disponível no pipeline de publish — por isso o domínio público quebra.

## Plano

**Ação principal: Republicar o app.**

Um novo build vai embutir os valores corretos de `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no bundle, eliminando o erro e fazendo a tela branca desaparecer.

Passos:

1. Abrir o diálogo **Publish** (canto superior direito do editor).
2. Clicar em **Update** para forçar um novo build/deploy do frontend.
3. Aguardar a conclusão (~1–2 min) e recarregar https://maridaas.lovable.app com Ctrl+Shift+R (cache busting).

## Verificação

Após o redeploy:

- O console do navegador em https://maridaas.lovable.app **não deve** mais mostrar `supabaseUrl is required`.
- A landing page deve renderizar normalmente; usuárias logadas devem ser redirecionadas para `/feed`.
- O hash do bundle servido (`/assets/index-XXXX.js`) deve ser diferente de `index-CP8TdlsP.js`.

## Observações técnicas

- `src/integrations/supabase/client.ts` é gerado automaticamente pela plataforma e não pode ser editado manualmente, então não dá para adicionar fallback hardcoded ali.
- Não é necessária nenhuma mudança de código — o problema é exclusivamente do artefato publicado estar desatualizado em relação à `.env`.
- Após esta republicação, builds futuros (incluindo o iOS via Codemagic, que usa `npm run build` com a `.env` presente) continuarão funcionando normalmente.
