import { Shield, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/safeClient";

interface UserBadgeProps {
  userId: string;
  className?: string;
}

const UserBadge = ({ userId, className = "" }: UserBadgeProps) => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    loadRole();
  }, [userId]);

  const loadRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data) {
      setRole(data.role);
    }
  };

  if (!role || role === "user") return null;

  if (role === "admin") {
    return (
      <span className={`inline-flex items-center ${className}`} title="Administrador">
        <Crown className="w-4 h-4 text-amber-500" />
      </span>
    );
  }

  if (role === "moderator") {
    return (
      <span className={`inline-flex items-center ${className}`} title="Moderador">
        <Shield className="w-4 h-4 text-blue-500" />
      </span>
    );
  }

  return null;
};

export default UserBadge;
