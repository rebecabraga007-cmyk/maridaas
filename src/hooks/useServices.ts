import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/safeClient";
import { useToast } from "@/hooks/use-toast";

export interface Service {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  whatsapp: string | null;
  instagram: string | null;
  image_url: string | null;
  owner_name: string;
  owner_avatar: string | null;
  avg_rating: number;
  review_count: number;
}

export interface Profile {
  primary_neighborhood_id: string | null;
  neighborhood: string;
  city: string;
}

export function useServices() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("primary_neighborhood_id, neighborhood, city")
      .eq("user_id", userId)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar seu perfil.",
        variant: "destructive",
      });
      return;
    }

    if (data) setUserProfile(data);
  }, [toast]);

  const checkUserRoles = useCallback(async (userId: string) => {
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) return;

    if (roles) {
      setIsAdmin(roles.some((r) => r.role === "admin"));
      setIsModerator(roles.some((r) => r.role === "moderator"));
    }
  }, []);

  const checkPremiumStatus = useCallback(async (userId: string) => {
    setCheckingPremium(true);

    const { data, error } = await supabase.rpc("is_premium_user", { _user_id: userId });

    if (!error) setIsPremium(Boolean(data));

    setCheckingPremium(false);
  }, []);

  const loadServices = useCallback(async (neighborhoodId: string) => {
    const { data, error } = await supabase.rpc("get_services_with_details", {
      _neighborhood_id: neighborhoodId,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os serviços.",
        variant: "destructive",
      });
      return;
    }

    const normalized = (data || []).map((s: any) => ({
      ...s,
      avg_rating: typeof s.avg_rating === "number" ? s.avg_rating : Number(s.avg_rating || 0),
      review_count: typeof s.review_count === "number" ? s.review_count : Number(s.review_count || 0),
    })) as Service[];

    setServices(normalized);
  }, [toast]);

  const reloadServices = useCallback(async () => {
    if (!userProfile?.primary_neighborhood_id) return;
    await loadServices(userProfile.primary_neighborhood_id);
  }, [loadServices, userProfile?.primary_neighborhood_id]);

  useEffect(() => {
    if (!user) return;
    loadUserProfile(user.id);
    checkUserRoles(user.id);
    checkPremiumStatus(user.id);
  }, [user, loadUserProfile, checkUserRoles, checkPremiumStatus]);

  useEffect(() => {
    if (userProfile?.primary_neighborhood_id) {
      loadServices(userProfile.primary_neighborhood_id);
    }
  }, [userProfile?.primary_neighborhood_id, loadServices]);

  const locationLabel = useMemo(() => {
    if (!userProfile) return "";
    return `${userProfile.neighborhood}, ${userProfile.city}`;
  }, [userProfile]);

  return {
    user,
    loading,
    services,
    userProfile,
    locationLabel,
    isAdmin,
    isModerator,
    isPremium,
    checkingPremium,
    reloadServices,
  };
}
