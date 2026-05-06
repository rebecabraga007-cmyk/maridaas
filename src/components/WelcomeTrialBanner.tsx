import { useState, useEffect } from "react";
import { Gift, X, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "maridaas_welcome_trial_dismissed";

const WelcomeTrialBanner = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setDismissed(false);
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="mb-6 card-maridaas p-5 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-2 border-primary/30 relative overflow-hidden">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 shadow-elevated">
          <Gift className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-foreground text-lg mb-1">
            Bem-vinda à Maridaas! 🎉
          </h3>
          <p className="text-sm text-foreground mb-2">
            Você ganhou <span className="font-bold text-primary">2 meses grátis</span> de assinatura Premium como presente de boas-vindas.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            A cobrança de R$ 29,90/mês via Stripe só começa após esse período. Aproveite todos os recursos sem pagar nada agora.
          </p>
          <Button
            onClick={() => navigate("/premium")}
            size="sm"
            className="btn-maridaas"
          >
            <Crown className="w-4 h-4" />
            Ver meu Premium
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeTrialBanner;
