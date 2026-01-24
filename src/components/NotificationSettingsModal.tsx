import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationSettingsModalProps {
  onClose: () => void;
}

const NotificationSettingsModal = ({ onClose }: NotificationSettingsModalProps) => {
  const { subscribe, unsubscribe, isSubscribed, isLoading, permission } = usePushNotifications();
  const [actionLoading, setActionLoading] = useState(false);

  const handleToggleNotifications = async () => {
    setActionLoading(true);
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
    setActionLoading(false);
  };

  const isBlocked = permission === "denied";
  const isUnsupported = permission === "unsupported";

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

          <div className="text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isSubscribed ? 'bg-accent' : 'gradient-warm'}`}>
              <Bell className={`w-10 h-10 ${isSubscribed ? 'text-accent-foreground' : 'text-primary-foreground'}`} />
            </div>
            
            <h2 className="text-2xl font-display font-bold text-foreground mb-3">
              Notificações Push
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : isUnsupported ? (
              <>
                <p className="text-muted-foreground mb-6">
                  Seu navegador não suporta notificações push.
                </p>
                <Button onClick={onClose} variant="outline" className="w-full">
                  Fechar
                </Button>
              </>
            ) : isBlocked ? (
              <>
                <p className="text-muted-foreground mb-6">
                  As notificações foram bloqueadas. Para ativá-las, acesse as configurações do seu navegador.
                </p>
                <div className="bg-muted/50 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-sm text-foreground font-medium mb-2">Como desbloquear:</p>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs">1</span>
                      Clique no ícone de cadeado na barra de endereço
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs">2</span>
                      Encontre "Notificações" e altere para "Permitir"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs">3</span>
                      Recarregue a página
                    </li>
                  </ol>
                </div>
                <Button onClick={onClose} variant="outline" className="w-full">
                  Entendi
                </Button>
              </>
            ) : isSubscribed ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="text-primary font-medium">Notificações ativas</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Você receberá avisos sobre novidades no seu bairro.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Fechar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleToggleNotifications} 
                    className="flex-1"
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desativar"}
                  </Button>
                </div>
              </>
            ) : (
              <>
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
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Agora não
                  </Button>
                  <Button 
                    onClick={handleToggleNotifications} 
                    className="flex-1 btn-maridaas"
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ativar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsModal;
