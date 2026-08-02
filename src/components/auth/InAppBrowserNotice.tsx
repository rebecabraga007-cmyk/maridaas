import { useState } from "react";
import { ExternalLink, Check, Copy } from "lucide-react";
import {
  inAppBrowserLabel,
  isAndroid,
  openInExternalBrowser,
  copyCurrentUrl,
} from "@/lib/browserEnv";

/**
 * Saída de emergência para quem abre a página pelo navegador interno de um app
 * (Instagram, Facebook, TikTok...).
 *
 * IMPORTANTE — este componente é COMPLEMENTAR, nunca substitui os botões
 * sociais. O Google recusa OAuth vindo de WebView embutido com
 * `disallowed_useragent`, mas isso NÃO é uniforme: no navegador interno do
 * Instagram no iOS o login com Google funciona normalmente (testado). O bloqueio
 * é consistente mesmo é no WebView do Android (user-agent marcado com "; wv").
 *
 * Por isso os botões sociais continuam sempre visíveis e este aviso aparece
 * discretamente abaixo, resgatando só quem realmente esbarrar no bloqueio.
 */
const InAppBrowserNotice = () => {
  const [copied, setCopied] = useState(false);
  const label = inAppBrowserLabel();
  const android = isAndroid();

  const handleOpen = async () => {
    if (openInExternalBrowser()) return;
    // iOS não permite forçar a saída do WebView: copiamos o link como apoio.
    const ok = await copyCurrentUrl();
    setCopied(ok);
  };

  return (
    <p className="text-center text-xs text-muted-foreground">
      Não conseguiu entrar com Google ou Apple no {label}?{" "}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-primary font-medium underline underline-offset-2"
      >
        {copied ? <Check className="h-3 w-3" /> : android ? <ExternalLink className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Link copiado — cole no navegador" : android ? "Abrir no navegador" : "Copiar link do site"}
      </button>
    </p>
  );
};

export default InAppBrowserNotice;
