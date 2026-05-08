import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/safeClient";
import LoadingFallback from "./LoadingFallback";

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authorized, setAuthorized] = useState(!requireAdmin);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session?.user) {
        setAuthenticated(false);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      if (!requireAdmin) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!mounted) return;

      setAuthorized(Boolean(roleData));
      setLoading(false);
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthenticated(false);
        setAuthorized(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [requireAdmin]);

  if (loading) return <LoadingFallback />;

  if (!authenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (!authorized) {
    return <Navigate to="/feed" replace />;
  }

  return <Outlet />;
}
