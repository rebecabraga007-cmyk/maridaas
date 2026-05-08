# Remover funcionalidade Premium e pagamentos Stripe

Para atender à exigência da Apple, vamos remover toda a camada de monetização (Premium, trial, Stripe) do app. Todos os recursos antes restritos a Premium passam a ser gratuitos para qualquer usuária autenticada.

## O que muda para a usuária

- A página `/premium` deixa de existir (passa a redirecionar para o feed).
- Banner de "2 meses grátis" e qualquer aviso de trial são removidos.
- Botões "Assinar", "Gerenciar assinatura" e "Ver meu Premium" são removidos do app (Profile, Feed, BottomNav, Landing, etc.).
- Postagem de serviços deixa de exigir Premium — qualquer usuária pode publicar serviços livremente.
- Nada no app menciona R$ 29,90, Stripe, cobrança ou assinatura.

## Mudanças no frontend

- `src/App.tsx`: remover import e rota de `Premium`.
- `src/pages/Premium.tsx`: deletar.
- `src/components/WelcomeTrialBanner.tsx`: deletar e remover usos.
- `src/hooks/useServices.ts`: remover `isPremium`, `checkingPremium` e a chamada a `is_premium_user`.
- `src/pages/Services.tsx` e `ServicesView.tsx`: remover bloqueios/CTAs de Premium na criação de serviço.
- `src/components/CreateServiceModal.tsx`: remover qualquer gating de Premium.
- `src/components/BottomNav.tsx`, `Landing.tsx`, `Profile.tsx`, `Feed.tsx`, `Inbox.tsx`, `Neighborhoods.tsx`, `Messages.tsx`: remover links/badges/CTAs de Premium.
- `src/pages/PrivacyPolicy.tsx` e `TermsOfService.tsx`: remover seções sobre assinatura, cobrança e Stripe.

## Mudanças no backend (Lovable Cloud)

- Deletar Edge Functions: `create-checkout`, `customer-portal`, `check-subscription`.
- Remover entradas correspondentes em `supabase/config.toml`.
- Migração SQL para:
  - Dropar a tabela `subscriptions` (e policies/triggers relacionados).
  - Dropar a função `is_premium_user`.
  - Remover qualquer policy/trigger que referenciava Premium para postagem de serviços.
- A secret `STRIPE_SECRET_KEY` pode permanecer não utilizada (sem impacto); opcionalmente, removemos depois.

## Itens preservados

- Autenticação, perfil, feed, mural, serviços, mensagens, vizinhanças, push (OneSignal), admin — tudo continua funcionando.
- Apenas a camada de monetização é removida.

## Validação

- Build limpo sem referências a `Premium`, `Stripe`, `is_premium_user`, `subscriptions`.
- Navegação manual: `/premium` redireciona para `/feed`; criação de serviço funciona para usuária comum; nenhum banner de trial aparece.

Deseja que eu prossiga com essa remoção completa? Se sim, aprove o plano e eu aplico todas as mudanças (frontend + edge functions + migração SQL) em um único passo.
