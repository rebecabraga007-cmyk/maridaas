// Escolha do mecanismo de OAuth conforme a hospedagem.
//
// CONTEXTO — a razão de este arquivo existir:
// A lib @lovable.dev/cloud-auth-js inicia o login social redirecionando para
// `/~oauth/initiate`, um caminho RELATIVO. Esse endpoint não faz parte do build:
// ele é servido pela infraestrutura de hospedagem da Lovable. Em qualquer outra
// hospedagem (Render, Vercel...) o rewrite de SPA devolve o index.html, o React
// Router não encontra rota e a usuária cai num 404 — o login social morre em
// silêncio, sem criar conta e sem deixar rastro no Supabase.
//
// Fora dos domínios da Lovable usamos o OAuth nativo do Supabase, que redireciona
// para `https://<projeto>.supabase.co/auth/v1/authorize` — um endpoint absoluto,
// independente de onde o front está hospedado.
//
// REQUISITO no modo supabase: os provedores Google/Apple precisam estar ativados
// em Authentication → Providers no painel do Supabase, e a URL do site precisa
// estar na allowlist de redirect. Sem isso o login retorna erro visível (com
// toast), o que ainda é bem melhor que o 404 mudo de hoje.

const LOVABLE_HOSTS = [".lovable.app", ".lovableproject.com", ".lovable.dev"];

export type OAuthMode = "lovable" | "supabase";

/** Permite forçar o modo via env, útil para testar ou para domínio customizado. */
const CONFIGURED = (import.meta.env.VITE_OAUTH_MODE as string | undefined)?.trim().toLowerCase();

function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:" ||
    // @ts-ignore - Capacitor é injetado em runtime
    !!(window as any).Capacitor?.isNativePlatform?.()
  );
}

export function isLovableHosted(hostname?: string): boolean {
  if (typeof window === "undefined") return false;
  const host = (hostname ?? window.location.hostname).toLowerCase();
  return LOVABLE_HOSTS.some((suffix) => host.endsWith(suffix));
}

/**
 * Qual caminho de OAuth usar neste ambiente.
 *
 * O app nativo (Capacitor) permanece no broker da Lovable: é o comportamento já
 * publicado nas lojas e trocá-lo às cegas seria arriscado.
 */
export function resolveOAuthMode(): OAuthMode {
  if (CONFIGURED === "lovable" || CONFIGURED === "supabase") return CONFIGURED;
  if (isNativeShell()) return "lovable";
  return isLovableHosted() ? "lovable" : "supabase";
}
