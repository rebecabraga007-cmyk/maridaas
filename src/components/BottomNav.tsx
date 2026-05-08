import * as React from "react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Home, MapPin, User as UserIcon, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/safeClient";

type BottomNavItemProps = React.ComponentPropsWithoutRef<"button"> & {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

const BottomNavItem = React.forwardRef<HTMLButtonElement, BottomNavItemProps>(
  ({ icon, label, active, className, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cn(
        "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors",
        active ? "text-primary" : "text-muted-foreground",
        className
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
);
BottomNavItem.displayName = "BottomNavItem";

const isPathActive = (pathname: string, target: string) =>
  pathname === target || pathname.startsWith(`${target}/`);

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        loadUnreadCount(session.user.id);
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
        loadUnreadCount(session.user.id);
      } else {
        setCurrentUserId(null);
        setUnreadCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUnreadCount = async (userId: string) => {
    if (!userId) return;
    
    const [messagesRes, requestsRes] = await Promise.all([
      supabase.from("user_messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).is("read_at", null),
      supabase.from("friendships").select("id", { count: "exact", head: true }).eq("addressee_id", userId).eq("status", "pending"),
    ]);
    
    const total = (messagesRes.count || 0) + (requestsRes.count || 0);
    setUnreadCount(total);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-40" aria-label="Navegação principal">
      <div className="container mx-auto px-2 flex items-center justify-around py-2">
        <BottomNavItem
          icon={<Home className="w-6 h-6" />}
          label="Início"
          active={isPathActive(pathname, "/feed")}
          onClick={() => navigate("/feed")}
          aria-label="Ir para o feed"
        />
        <BottomNavItem
          icon={<Briefcase className="w-6 h-6" />}
          label="Serviços"
          active={isPathActive(pathname, "/services")}
          onClick={() => navigate("/services")}
          aria-label="Ver serviços"
        />
        <BottomNavItem
          icon={
            <div className="relative">
              <Mail className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          }
          label="Recados"
          active={isPathActive(pathname, "/inbox") || isPathActive(pathname, "/messages")}
          onClick={() => navigate("/inbox")}
          aria-label="Ver recados"
        />
        <BottomNavItem
          icon={<MapPin className="w-6 h-6" />}
          label="Bairros"
          active={isPathActive(pathname, "/neighborhoods")}
          onClick={() => navigate("/neighborhoods")}
          aria-label="Explorar bairros"
        />
        <BottomNavItem
          icon={<UserIcon className="w-6 h-6" />}
          label="Perfil"
          active={isPathActive(pathname, "/profile")}
          onClick={() => navigate("/profile")}
          aria-label="Meu perfil"
        />
      </div>
    </nav>
  );
}
