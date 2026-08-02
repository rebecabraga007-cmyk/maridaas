// Detecção de navegadores embutidos (in-app browsers / WebViews de apps).
//
// POR QUE ISSO EXISTE:
// O login social do projeto (Google/Apple) é iniciado por um redirect de página
// inteira para o broker OAuth. O Google **recusa** completar OAuth quando a
// requisição vem de um WebView embutido e responde `403 disallowed_useragent`
// ("This browser or app may not be secure"). Isso atinge exatamente o tráfego
// pago vindo dos Stories do Instagram, que abre os links no navegador interno.
//
// Sem detecção, a usuária toca em "Continuar com Google", é jogada numa tela de
// erro do Google e vai embora — sem nenhuma conta criada e sem nenhum sinal no
// nosso lado. Este módulo permite oferecer um caminho que funciona.

export type InAppBrowser =
  | "instagram"
  | "facebook"
  | "messenger"
  | "tiktok"
  | "whatsapp"
  | "linkedin"
  | "twitter"
  | "snapchat"
  | "pinterest"
  | "webview"
  | null;

const PATTERNS: Array<{ id: Exclude<InAppBrowser, null>; re: RegExp }> = [
  { id: "instagram", re: /Instagram/i },
  { id: "messenger", re: /\bMessenger\b|MessengerLite/i },
  { id: "facebook", re: /FBAN|FBAV|FB_IAB|FBIOS/i },
  { id: "tiktok", re: /BytedanceWebview|musical_ly|TikTok|Bytedance/i },
  { id: "whatsapp", re: /WhatsApp/i },
  { id: "linkedin", re: /LinkedInApp/i },
  { id: "twitter", re: /\bTwitter\b|TwitterAndroid/i },
  { id: "snapchat", re: /Snapchat/i },
  { id: "pinterest", re: /Pinterest/i },
  // WebView genérico do Android: a Google marca essas requisições com "; wv".
  { id: "webview", re: /;\s*wv\)/i },
];

const LABELS: Record<Exclude<InAppBrowser, null>, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  twitter: "X",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
  webview: "app",
};

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);

/** Retorna qual app embutiu o navegador, ou null se for um navegador comum. */
export function detectInAppBrowser(userAgent: string = ua()): InAppBrowser {
  if (!userAgent) return null;
  // Capacitor roda num WebView nativo, mas ali o login é tratado pelo app —
  // não queremos exibir avisos de "abra no navegador" dentro do nosso próprio app.
  if (isNativeApp()) return null;
  return PATTERNS.find((p) => p.re.test(userAgent))?.id ?? null;
}

export function isInAppBrowser(): boolean {
  return detectInAppBrowser() !== null;
}

/** Nome amigável do app para exibir na mensagem ("Instagram", "TikTok"...). */
export function inAppBrowserLabel(): string {
  const id = detectInAppBrowser();
  return id ? LABELS[id] : "app";
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:" ||
    // @ts-ignore - Capacitor é injetado em runtime
    !!(window as any).Capacitor?.isNativePlatform?.()
  );
}

export function isAndroid(): boolean {
  return /Android/i.test(ua());
}

export function isIOS(): boolean {
  const agent = ua();
  if (/iPhone|iPad|iPod/i.test(agent)) return true;
  // iPadOS 13+ se apresenta como Macintosh com touch.
  return /Macintosh/i.test(agent) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
}

/**
 * Tenta escapar do navegador embutido abrindo a mesma URL no navegador padrão.
 *
 * No Android isso é confiável: o esquema `intent://` com fallback faz o sistema
 * entregar o link ao Chrome. No iOS não existe API equivalente — o app precisa
 * instruir a usuária a usar o menu "..." → "Abrir no navegador".
 *
 * @returns true se conseguimos disparar a abertura externa.
 */
export function openInExternalBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const { href, host, pathname, search, hash } = window.location;

  if (isAndroid()) {
    const rest = `${host}${pathname}${search}${hash}`;
    // S.browser_fallback_url leva ao navegador padrão caso o Chrome não exista.
    window.location.href =
      `intent://${rest}#Intent;scheme=https;package=com.android.chrome;` +
      `S.browser_fallback_url=${encodeURIComponent(href)};end`;
    return true;
  }

  return false;
}

/** Copia a URL atual para a área de transferência (fallback do iOS). */
export async function copyCurrentUrl(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
}
