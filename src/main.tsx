import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const safeText = (value: unknown) =>
  String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] ?? char));

function renderFallback(title: string, message: string) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#F5FAF9;color:#1f2937;">
      <div style="max-width:420px;text-align:center;">
        <h1 style="font-size:20px;margin:0 0 12px;color:#0f766e;">${safeText(title)}</h1>
        <pre style="font-size:12px;line-height:1.5;margin:0 0 16px;white-space:pre-wrap;text-align:left;">${safeText(message)}</pre>
        <button onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:8px;background:#0f766e;color:white;font-size:14px;cursor:pointer;">
          Recarregar
        </button>
      </div>
    </div>
  `;
}

// Best-effort cleanup of any old service workers / caches from previous PWA builds.
async function cleanupServiceWorkersAndCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister().catch(() => undefined)));
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n).catch(() => undefined)));
    }
  } catch {
    // ignore — cleanup is opportunistic
  }
}

void cleanupServiceWorkersAndCaches();

// Global error handlers — log but never blank the screen for async rejections.
// Apple's review caught intermittent post-login errors; this prevents silent crashes.
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    // eslint-disable-next-line no-console
    console.error("[Maridaas window.error]", event.message, event.error);
  });
  window.addEventListener("unhandledrejection", (event) => {
    // eslint-disable-next-line no-console
    console.error("[Maridaas unhandledrejection]", event.reason);
    // Prevent the runtime from treating this as a fatal app crash.
    event.preventDefault?.();
  });
}

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Root element ausente");
  createRoot(rootEl).render(<App />);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[Maridaas bootstrap] Falha ao iniciar:", err);
  renderFallback(
    "Algo deu errado ao iniciar",
    err instanceof Error ? err.stack ?? err.message : "Erro inesperado no bootstrap."
  );
}
