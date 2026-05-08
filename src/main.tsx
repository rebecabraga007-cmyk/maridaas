import { createRoot } from "react-dom/client";
import "./index.css";

document.body.innerHTML = `
  <div id="boot-status" style="padding:20px;font-family:sans-serif;background:#111;color:#0f0;white-space:pre-wrap;position:relative;z-index:2147483647;">
    Inicializando aplicação...
  </div>
  <div id="root"></div>
`;

const safeText = (value: unknown) =>
  String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] ?? char));

const logBoot = (msg: string) => {
  // eslint-disable-next-line no-console
  console.log(msg);
  const el = document.getElementById("boot-status");
  if (el) {
    el.innerHTML += `<br/>${safeText(msg)}`;
  }
};

function renderFallback(title: string, message: string) {
  const target = document.body;
  target.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#F5FAF9;color:#1f2937;">
      <div style="max-width:420px;text-align:center;">
        <h1 style="font-size:20px;margin:0 0 12px;color:#0f766e;">${safeText(title)}</h1>
        <p style="font-size:14px;line-height:1.5;margin:0 0 16px;">${safeText(message)}</p>
        <button onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:8px;background:#0f766e;color:white;font-size:14px;cursor:pointer;">
          Recarregar
        </button>
      </div>
    </div>
  `;
}

window.onerror = function (message, source, lineno, colno, error) {
  // eslint-disable-next-line no-console
  console.error(error ?? message);
  document.body.innerHTML = `
    <div style="min-height:100vh;padding:20px;background:#000;color:red;font-family:sans-serif;white-space:pre-wrap;">
      <h1>Erro fatal</h1>
      <pre>${safeText(message)}</pre>
      <pre>${safeText(source ?? "origem desconhecida")}</pre>
      <pre>${safeText(`${lineno}:${colno}`)}</pre>
    </div>
  `;
};

window.addEventListener("unhandledrejection", (event) => {
  // eslint-disable-next-line no-console
  console.error(event.reason);
  document.body.innerHTML = `
    <div style="min-height:100vh;padding:20px;background:#000;color:orange;font-family:sans-serif;white-space:pre-wrap;">
      <h1>Promise rejeitada</h1>
      <pre>${safeText(event.reason instanceof Error ? event.reason.stack ?? event.reason.message : JSON.stringify(event.reason, null, 2))}</pre>
    </div>
  `;
});

logBoot("main.tsx carregado");

const rootEl = document.getElementById("root");

async function cleanupServiceWorkersAndCaches() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    logBoot(`Service workers removidos: ${registrations.length}`);
  } else {
    logBoot("Service worker indisponível neste ambiente");
  }

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    logBoot(`Caches removidos: ${cacheNames.length}`);
  } else {
    logBoot("Cache Storage indisponível neste ambiente");
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function bootstrap() {
  try {
    if (!rootEl) {
      throw new Error("Root element ausente");
    }

    logBoot(`Backend URL: ${SUPABASE_URL ? "ok" : "ausente"}`);
    logBoot(`Backend key: ${SUPABASE_KEY ? "ok" : "ausente"}`);

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Variáveis do backend ausentes no bundle");
    }

    await cleanupServiceWorkersAndCaches();

    logBoot("Importando App");
    const { default: App } = await import("./App.tsx");

    logBoot("React inicializando");
    createRoot(rootEl).render(<App />);
    logBoot("React renderizado");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Maridaas bootstrap] Falha ao iniciar:", err);
    renderFallback(
      "Algo deu errado ao iniciar",
      err instanceof Error ? err.stack ?? err.message : "Erro inesperado no bootstrap do aplicativo."
    );
  }
}

void bootstrap();
