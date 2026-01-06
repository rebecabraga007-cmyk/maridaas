import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Bell, Check, ArrowRight, X } from "lucide-react";

interface OnboardingModalProps {
  onClose: () => void;
}

const OnboardingModal = ({ onClose }: OnboardingModalProps) => {
  const [step, setStep] = useState(1);

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
    }
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl shadow-elevated max-w-md w-full overflow-hidden animate-scale-in">
        <div className="relative p-6">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                <Smartphone className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Bem-vinda à Maridaas! 🎉
              </h2>
              <p className="text-muted-foreground mb-6">
                Adicione o app à sua tela inicial para acesso rápido.
              </p>
              
              <div className="bg-muted/50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-sm text-foreground font-medium mb-2">Como adicionar:</p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs">1</span>
                    Toque no ícone de compartilhar do seu navegador
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs">2</span>
                    Selecione "Adicionar à tela inicial"
                  </li>
                </ol>
              </div>

              <Button onClick={() => setStep(2)} className="w-full btn-maridaas">
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

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
                  <Check className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">Novos serviços disponíveis</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">Mensagens de vizinhas</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">Avisos importantes da comunidade</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  Agora não
                </Button>
                <Button onClick={requestNotifications} className="flex-1 btn-maridaas">
                  Ativar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-teal-light flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Tudo pronto!
              </h2>
              <p className="text-muted-foreground mb-6">
                Agora você pode explorar sua comunidade e se conectar com vizinhas.
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