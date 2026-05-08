import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

const rootEl = document.getElementById("root");

function renderFallback(title: string, message: string) {
  const target = rootEl ?? document.body;
  target.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#F5FAF9;color:#1f2937;">
      <div style="max-width:420px;text-align:center;">
        <h1 style="font-size:20px;margin:0 0 12px;color:#0f766e;">${title}</h1>
        <p style="font-size:14px;line-height:1.5;margin:0 0 16px;">${message}</p>
        <button onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:8px;background:#0f766e;color:white;font-size:14px;cursor:pointer;">
          Recarregar
        </button>
      </div>
    </div>
  `;
}

if (!rootEl) {
  renderFallback(
    "Erro ao iniciar o Maridaas",
    "Elemento raiz não encontrado. Por favor, recarregue o aplicativo."
  );
  // eslint-disable-next-line no-console
  console.error("[Maridaas bootstrap] Root element ausente.");
  throw new Error("Root element ausente");
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  renderFallback(
    "Maridaas está indisponível no momento",
    "Estamos atualizando o aplicativo. Por favor, recarregue em alguns instantes."
  );
  // eslint-disable-next-line no-console
  console.error(
    "[Maridaas bootstrap] Variáveis de ambiente do backend ausentes no bundle."
  );
  throw new Error("Variáveis Supabase ausentes");
}

try {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[Maridaas bootstrap] Falha ao renderizar App:", err);
  renderFallback(
    "Algo deu errado ao iniciar",
    "Ocorreu um erro inesperado. Tente recarregar o aplicativo."
  );
}
