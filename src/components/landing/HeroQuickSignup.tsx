import { useState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GoogleIcon, AppleIcon, getIsApplePlatform, useOAuth } from "@/components/auth/oauth";

interface HeroQuickSignupProps {
  /** Abre o modal de cadastro completo, opcionalmente com o email já preenchido. */
  onOpenSignup: (email?: string) => void;
}

/**
 * Cadastro ultra-enxuto visível já na primeira dobra: 1-clique via
 * Google/Apple ou email + CTA, que abre o restante do fluxo em modal.
 */
const HeroQuickSignup = ({ onOpenSignup }: HeroQuickSignupProps) => {
  const { toast } = useToast();
  const { oauthLoading, handleOAuth } = useOAuth();
  const [email, setEmail] = useState("");
  const isApple = getIsApplePlatform();

  const socialButtons = [
    { key: "google" as const, icon: <GoogleIcon />, label: "Continuar com Google", className: "" },
    { key: "apple" as const, icon: <AppleIcon />, label: "Continuar com Apple", className: "bg-black text-white hover:bg-black/90 hover:text-white" },
  ];
  if (isApple) socialButtons.reverse();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Email inválido", description: "Digite um email válido para continuar.", variant: "destructive" });
      return;
    }
    onOpenSignup(email);
  };

  return (
    <div className="card-maridaas p-6 md:p-8 text-left max-w-md mx-auto" id="cadastro-rapido">
      <p className="text-sm font-semibold text-foreground mb-4 text-center">
        Crie sua conta grátis em menos de 30 segundos
      </p>

      <div className="space-y-3 mb-4">
        {socialButtons.map((btn) => (
          <Button
            key={btn.key}
            type="button"
            variant="outline"
            className={`w-full h-12 text-base font-medium gap-3 border-border ${btn.className}`}
            onClick={() => handleOAuth(btn.key)}
            disabled={oauthLoading !== null}
            aria-label={btn.label}
          >
            {oauthLoading === btn.key ? <Loader2 className="h-5 w-5 animate-spin" /> : btn.icon}
            {btn.label}
          </Button>
        ))}
      </div>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <Input
            type="email"
            inputMode="email"
            placeholder="Seu melhor e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-maridaas pl-11 h-12"
            aria-label="Seu melhor e-mail"
            autoComplete="email"
          />
        </div>
        <Button type="submit" size="lg" className="btn-maridaas w-full h-12 text-base">
          Cadastrar Grátis
        </Button>
      </form>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-4">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Leva menos de 30 segundos · 100% Gratuito
      </p>
    </div>
  );
};

export default HeroQuickSignup;
