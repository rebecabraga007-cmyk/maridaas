# Plano para corrigir a tela branca do site publicado

## Objetivo
Fazer o site publicado parar de abrir em branco e garantir um publish estável para envio à App Store.

## O que foi confirmado
- O site publicado `maridaas.lovable.app` carrega um bundle específico: `assets/index-CP8TdlsP.js`.
- Esse bundle quebra na inicialização com o erro: `supabaseUrl is required`.
- O preview atual não está na mesma falha fatal: ele ao menos renderiza a tela de carregamento.
- O projeto lê as variáveis de cliente por `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`.
- O arquivo `.gitignore` ainda ignora `.env`, o que é compatível com o cenário clássico de publish gerar bundle sem essas variáveis quando o ambiente gerenciado não foi refletido corretamente no artefato publicado.

## Implementação proposta
1. Ajustar a inicialização do cliente para falhar de forma controlada no frontend
   - Evitar que uma ausência de variável derrube toda a aplicação com tela branca.
   - Substituir a falha síncrona por tratamento explícito e mensagem de erro renderizável.
   - Isso garante que, se o ambiente publicado voltar a sair errado, o app mostra erro diagnosticável em vez de branco total.

2. Adicionar proteção de bootstrap no app
   - Colocar uma checagem de configuração antes de montar fluxos que dependem do backend.
   - Exibir fallback visual consistente com a identidade do app quando as variáveis obrigatórias não existirem.

3. Remover a fragilidade estrutural ligada ao `.env` no repositório
   - Parar de depender de uma configuração que pode gerar artefato publicado sem as variáveis no bundle final.
   - Ajustar o projeto para o fluxo gerenciado atual, reduzindo a chance de novo publish sair com bundle quebrado.

4. Validar preview e publicado
   - Confirmar que o preview continua carregando.
   - Publicar/atualizar e verificar se o domínio publicado deixa de servir o bundle quebrado e para de lançar `supabaseUrl is required`.

## Resultado esperado
- O publicado deixa de abrir em branco.
- Se houver problema de configuração em builds futuros, o app mostra erro controlado em vez de tela branca.
- O pipeline fica mais robusto para o próximo ciclo de publicação iOS.

## Detalhes técnicos
- Arquivos mais prováveis de ajuste:
  - `src/integrations/supabase/client.ts` (sem editar manualmente se continuar gerado; se necessário, a proteção deve subir para a camada de bootstrap que o consome)
  - arquivo de entrada do app / composição principal
  - `.gitignore`
- Validação final:
  - console do publicado sem `supabaseUrl is required`
  - screenshot do publicado renderizando UI
  - conferência do novo asset hash publicado
