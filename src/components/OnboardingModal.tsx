import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Bell, Check, ArrowRight, X, Loader2 } from "lucide-react";
import { useOneSignalPush } from "@/hooks/useOneSignalPush";

interface OnboardingModalProps {
  onClose: () => void;
}

const OnboardingModal = ({ onClose }: OnboardingModalProps) => {
  const [step, setStep] = useState(1);
  const { subscribe, isLoading, needsPWAInstall, isSupported } = useOneSignalPush();
  const [subscribing, setSubscribing] = useState(false);
  const pushAvailable = isSupported || needsPWAInstall;

  const handleActivateNotifications = async () => {
    setSubscribing(true);
    await subscribe();
    setSubscribing(false);
    setStep(3);
  };

  const handleSkipNotifications = () => {
    setStep(3);
  };

  const totalSteps = 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl shadow-elevated max-w-md w-full overflow-hidden animate-scale-in">
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 === step
                    ? "w-8 bg-primary"
                    : i + 1 < step
                    ? "w-4 bg-primary/40"
                    : "w-4 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Welcome + Install PWA */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                <Smartphone className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Bem-vinda à Maridaas! 🎉
              </h2>
              <p className="text-muted-foreground mb-6">
                Adicione o app à sua tela inicial para ter a melhor experiência.
              </p>

              <div className="bg-muted/50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-sm text-foreground font-medium mb-2">Como instalar:</p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs">
                      1
                    </span>
                    Toque no ícone de compartilhar (↑) do seu navegador
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs">
                      2
                    </span>
                    Selecione "Adicionar à Tela de Início"
                  </li>
                </ol>
              </div>

              <Button onClick={() => setStep(2)} className="w-full btn-maridaas">
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Notifications */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center mx-auto mb-6">
                <Bell className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Ative as notificações
              </h2>
              <p className="text-muted-foreground mb-6">
                Fique por dentro do que acontece no seu bairro em tempo real.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-left">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">Novos serviços disponíveis</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">Mensagens de vizinhas</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">Avisos importantes da comunidade</span>
                </div>
              </div>

              {needsPWAInstall ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    No iPhone, instale o app na tela inicial primeiro para receber notificações.
                  </p>
                  <Button onClick={handleSkipNotifications} variant="outline" className="w-full">
                    Continuar sem notificações
                  </Button>
                </>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleSkipNotifications} className="flex-1">
                    Agora não
                  </Button>
                  <Button
                    onClick={handleActivateNotifications}
                    className="flex-1 btn-maridaas"
                    disabled={subscribing || isLoading}
                  >
                    {subscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Ativar"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: All done */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Tudo pronto! 🎉
              </h2>
              <p className="text-muted-foreground mb-2">
                Agora você pode explorar sua comunidade e se conectar com vizinhas.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Você pode ativar ou desativar as notificações a qualquer momento no seu perfil ou pelo ícone 🔔.
              </p>

              <Button onClick={onClose} className="w-full btn-maridaas">
                Começar a explorar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
