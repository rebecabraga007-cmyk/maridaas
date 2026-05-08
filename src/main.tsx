import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

const rootEl = document.getElementById("root")!;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Fallback visível quando o build foi publicado sem as variáveis de ambiente.
  // Evita tela branca total e dá um caminho de ação ao usuário.
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#F5FAF9;color:#1f2937;">
      <div style="max-width:420px;text-align:center;">
        <h1 style="font-size:20px;margin:0 0 12px;color:#0f766e;">Maridaas está indisponível no momento</h1>
        <p style="font-size:14px;line-height:1.5;margin:0 0 16px;">
          Estamos atualizando o aplicativo. Por favor, recarregue a página em alguns instantes.
        </p>
        <button onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:8px;background:#0f766e;color:white;font-size:14px;cursor:pointer;">
          Recarregar
        </button>
      </div>
    </div>
  `;
  // Log para diagnóstico no console publicado.
  // eslint-disable-next-line no-console
  console.error("[Maridaas bootstrap] Variáveis de ambiente do backend ausentes no bundle publicado.");
} else {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
