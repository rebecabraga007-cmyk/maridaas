import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Search,
  Mail,
  Shield,
  Bell,
  LogOut,
  ChevronDown,
  Star,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NeighborhoodInfo {
  id: string;
  name: string;
  city: string;
}

interface FeedHeaderProps {
  userProfile: {
    neighborhood: string;
    city: string;
    secondary_neighborhood_id: string | null;
  } | null;
  neighborhoodInfo: { primary: NeighborhoodInfo | null; secondary: NeighborhoodInfo | null };
  selectedNeighborhood: "primary" | "secondary";
  onToggleNeighborhood: () => void;
  unreadCount: number;
  isAdmin: boolean;
  onSearchClick: () => void;
  onInboxClick: () => void;
  onAdminClick: () => void;
  onNotificationClick: () => void;
  onLogout: () => void;
}

export default function FeedHeader({
  userProfile,
  neighborhoodInfo,
  selectedNeighborhood,
  onToggleNeighborhood,
  unreadCount,
  isAdmin,
  onSearchClick,
  onInboxClick,
  onAdminClick,
  onNotificationClick,
  onLogout,
}: FeedHeaderProps) {
  const hasSecondary = userProfile?.secondary_neighborhood_id && neighborhoodInfo.secondary;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Maridaas" className="h-8 w-8" />
          <div>
            {hasSecondary ? (
              <div className="relative">
                <button onClick={onToggleNeighborhood} className="flex items-center gap-2 group">
                  <div className="flex items-center gap-1">
                    {selectedNeighborhood === "primary" && (
                      <Star className="w-3 h-3 text-secondary fill-secondary" />
                    )}
                    <h1 className="text-lg font-display font-bold text-foreground">
                      {selectedNeighborhood === "primary"
                        ? neighborhoodInfo.primary?.name || userProfile?.neighborhood || "Seu Bairro"
                        : neighborhoodInfo.secondary!.name}
                    </h1>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {selectedNeighborhood === "primary"
                    ? neighborhoodInfo.primary?.city || userProfile?.city || "Sua Cidade"
                    : neighborhoodInfo.secondary!.city}
                  <span className="ml-1 text-primary">• Toque para alternar</span>
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-display font-bold text-foreground">
                  {neighborhoodInfo.primary?.name || userProfile?.neighborhood || "Seu Bairro"}
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {neighborhoodInfo.primary?.city || userProfile?.city || "Sua Cidade"}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onSearchClick}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onInboxClick} className="relative">
            <Mail className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={onAdminClick} className="text-secondary">
              <Shield className="h-5 w-5" />
            </Button>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={onNotificationClick} aria-label="Configurações de notificação">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sair">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
