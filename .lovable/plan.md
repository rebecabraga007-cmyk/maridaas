## Atualizar Política de Privacidade no app

Substituir o conteúdo de `src/pages/PrivacyPolicy.tsx` pela versão completa (LGPD + GDPR) já gerada em `/mnt/documents/maridaas-politica-de-privacidade.md`, mantendo:

- Rota existente `/privacidade` (já registrada em `App.tsx`)
- Header com botão voltar
- `SEOHead` com canonical `https://maridaas.lovable.app/privacidade`
- Estilo `prose` do Tailwind

### Mudanças

1. **`src/pages/PrivacyPolicy.tsx`** — reescrever conteúdo com as 12 seções:
   1. Sobre o Maridaas
   2. Dados coletados (fornecidos / automáticos / terceiros — Supabase, Stripe, OneSignal, Google/Apple)
   3. Como usamos
   4. Compartilhamento
   5. Armazenamento e segurança
   6. Direitos LGPD/GDPR
   7. Cookies
   8. Retenção
   9. Menores
   10. Transferência internacional
   11. Alterações
   12. Contato (privacidade@maridaas.com + https://maridaas.lovable.app)

   Exibir a URL oficial (`https://maridaas.lovable.app/privacidade`) no topo da página, como referência para App Store/Google Play.

Nenhuma outra alteração — rota, footer e links existentes para `/privacidade` continuam funcionando.
