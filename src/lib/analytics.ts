// Carregamento assíncrono/adiado de scripts de terceiros (Meta Pixel, GA4).
// Nada é injetado enquanto as variáveis de ambiente correspondentes não forem
// configuradas, e o carregamento real só acontece em tempo ocioso do browser
// (requestIdleCallback), depois do first paint — nunca bloqueia o carregamento inicial.

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: Window["fbq"];
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

function loadMetaPixel(pixelId: string) {
  if (window.fbq) return;

  const fbq: Window["fbq"] = function (...args: unknown[]) {
    (fbq.queue = fbq.queue || []).push(args);
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

function loadGoogleAnalytics(measurementId: string) {
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

function loadDeferredScripts() {
  if (META_PIXEL_ID) loadMetaPixel(META_PIXEL_ID);
  if (GA_MEASUREMENT_ID) loadGoogleAnalytics(GA_MEASUREMENT_ID);
}

/**
 * Agenda o carregamento dos scripts de terceiros para o primeiro momento
 * ocioso do browser (ou, no máximo, ~2s depois do mount em navegadores sem
 * suporte a requestIdleCallback, ex.: Safari).
 */
export function scheduleThirdPartyScripts() {
  if (typeof window === "undefined") return;
  if (!META_PIXEL_ID && !GA_MEASUREMENT_ID) return;

  if ("requestIdleCallback" in window) {
    (window as typeof window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(loadDeferredScripts, { timeout: 2000 });
  } else {
    setTimeout(loadDeferredScripts, 2000);
  }
}
