import { useState } from "react";
import { ExternalLink, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  inAppBrowserLabel,
  isAndroid,
  openInExternalBrowser,
  copyCurrentUrl,
} from "@/lib/browserEnv";

/**
 * Aviso exibido quando a página está aberta dentro do navegador interno de um
 * app (Instagram, Facebook, TikTok...). Nesses WebViews o Google bloqueia o
 * OAuth com `disallowed_useragent`, então em vez de mostrar um botão que sempre
 * falha, oferecemos a saída para o navegador padrão.
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
    <div className="rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-sm text-foreground">
      <p className="mb-3">
        Para entrar com <strong>Google</strong> ou <strong>Apple</strong>, abra a Maridaas no seu
        navegador — o {label} não permite login social por dentro do app.
        {!android && " Toque em ••• no canto e escolha “Abrir no navegador”."}
      </p>

      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        className="w-full h-11 gap-2 bg-background"
      >
        {copied ? <Check className="h-4 w-4" /> : android ? <ExternalLink className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Link copiado — cole no navegador" : android ? "Abrir no navegador" : "Copiar link do site"}
      </Button>

      <p className="mt-3 text-xs text-muted-foreground">
        Ou continue por aqui mesmo usando seu e-mail — funciona normalmente.
      </p>
    </div>
  );
};

export default InAppBrowserNotice;
