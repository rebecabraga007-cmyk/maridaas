import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tela exibida quando o SPA é montado numa rota `/~oauth/*`.
 *
 * Esse caminho NUNCA deveria chegar ao React: `/~oauth/initiate` é o endpoint do
 * broker OAuth, servido pela infraestrutura de hospedagem da Lovable. Quando o
 * app roda em outra hospedagem (Vercel/Render), o rewrite de SPA — em
 * vercel.json: `"source": "/(.*)" -> "/index.html"` — engole essa rota e devolve
 * o index. Resultado: o login social morre num 404 genérico, sem nenhuma pista.
 *
 * Se esta tela aparecer, o login social está quebrado NESTE domínio e é preciso
 * ou publicar pela Lovable, ou excluir `/~oauth/*` do rewrite na hospedagem.
 */
const OAuthUnavailable = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const provider = searchParams.get("provider");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(
      "[Maridaas OAuth] O endpoint do broker foi capturado pelo rewrite de SPA — " +
        "login social indisponível neste domínio.",
      { path: location.pathname, host: window.location.host, provider },
    );
  }, [location.pathname, provider]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="card-maridaas max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-salmon-light text-accent-foreground flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>

        <h1 className="text-xl font-display font-bold text-foreground mb-3">
          Login social indisponível neste endereço
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Não foi possível continuar com {provider === "apple" ? "Apple" : "Google"} por aqui. Você
          pode criar sua conta com e-mail agora mesmo — leva menos de 30 segundos.
        </p>

        <div className="space-y-3">
          <Button asChild className="btn-maridaas w-full h-12">
            <a href="/auth?mode=signup">Criar conta com e-mail</a>
          </Button>
          <Button asChild variant="outline" className="w-full h-12">
            <a href="/">Voltar para o início</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OAuthUnavailable;
