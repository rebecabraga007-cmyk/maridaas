import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationPromptProps {
  onClose: () => void;
}

const NotificationPrompt = ({ onClose }: NotificationPromptProps) => {
  const { requestPermission, permission, isSupported } = useNotifications();
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isSupported || permission === "granted") {
    return null;
  }

  const handleEnable = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
    onClose();
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            Ative as notificações
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Fique por dentro dos novos serviços e postagens do seu bairro!
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-xs"
            >
              Agora não
            </Button>
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={isRequesting}
              className="btn-maridaas text-xs"
            >
              {isRequesting ? "Ativando..." : "Ativar"}
            </Button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
