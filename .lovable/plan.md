# Plano para corrigir a tela branca publicada

## Objetivo
Fazer o site publicado carregar a versão correta do frontend, em vez do bundle antigo que ainda quebra na inicialização.

## O que foi confirmado
- O site publicado `maridaas.lovable.app` continua carregando o bundle `index-CP8TdlsP.js`.
- Esse bundle ainda dispara o erro `supabaseUrl is required`, por isso a tela fica branca.
- No código atual, o client usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` corretamente.
- As variáveis de ambiente existem no projeto atual, então o problema não parece ser do código-fonte e sim da versão publicada que ainda está desatualizada.

## Plano de ação
1. Verificar se o frontend atual já está pronto no editor/preview e não está mais gerando esse erro.
2. Atualizar a publicação do app para forçar uma nova versão pública do frontend.
3. Confirmar que o hash do arquivo JS publicado mudou e que `CP8TdlsP` deixou de ser servido.
4. Validar a página publicada após refresh forçado para garantir que a tela branca sumiu.
5. Se o hash continuar o mesmo após a atualização, investigar cache/publicação travada em vez de mexer novamente no código.

## Resultado esperado
- A URL publicada abre normalmente.
- O console não mostra mais `supabaseUrl is required`.
- O bundle público passa a ser uma nova versão, diferente de `index-CP8TdlsP.js`.

## Detalhes técnicos
- Causa mais provável: a publicação pública ainda está apontando para um build antigo, feito antes de a configuração atual estar válida.
- Como o erro acontece já na criação do client, qualquer bundle com variáveis ausentes derruba a aplicação inteira antes da renderização.
- Neste caso, a correção principal é de publicação do frontend, não de backend.
