import * as React from "react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Home, MapPin, User as UserIcon, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-40" aria-label="Navegação principal">
      <div className="container mx-auto px-4 flex items-center justify-around py-2">
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
