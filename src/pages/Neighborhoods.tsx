import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/safeClient";
import { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Search,
  MapPin,
  Users,
  Lock,
  Star,
  X,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { differenceInDays } from "date-fns";
import SEOHead from "@/components/SEOHead";

interface Neighborhood {
  id: string;
  name: string;
  city: string;
  member_count: number;
}

interface Profile {
  primary_neighborhood_id: string | null;
  secondary_neighborhood_id: string | null;
  neighborhood: string;
  city: string;
  last_neighborhood_change: string | null;
  last_secondary_neighborhood_change: string | null;
}

const Neighborhoods = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [changing, setChanging] = useState(false);
  const [settingSecondary, setSettingSecondary] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadNeighborhoods();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("primary_neighborhood_id, secondary_neighborhood_id, neighborhood, city, last_neighborhood_change, last_secondary_neighborhood_change")
      .eq("user_id", user.id)
      .single();

    if (data) setUserProfile(data);
  };

  const loadNeighborhoods = async () => {
    const { data } = await supabase
      .from("neighborhoods")
      .select("id, name, city")
      .order("city")
      .order("name");

    if (data) {
      const neighborhoodsWithCounts = await Promise.all(
        data.map(async (n) => {
          // Use security definer function to count members (bypasses RLS)
          const { data: countData } = await supabase
            .rpc("count_neighborhood_members", { _neighborhood_id: n.id });
          return { ...n, member_count: countData || 0 };
        })
      );
      setNeighborhoods(neighborhoodsWithCounts);
    }
  };

  const canChangeNeighborhood = () => {
    if (!userProfile?.last_neighborhood_change) return true;
    const lastChange = new Date(userProfile.last_neighborhood_change);
    const daysSince = differenceInDays(new Date(), lastChange);
    return daysSince >= 45;
  };

  const daysUntilChange = () => {
    if (!userProfile?.last_neighborhood_change) return 0;
    const lastChange = new Date(userProfile.last_neighborhood_change);
    const daysSince = differenceInDays(new Date(), lastChange);
    return Math.max(0, 45 - daysSince);
  };

  const handleChangeNeighborhood = async (neighborhoodId: string) => {
    if (!user || !canChangeNeighborhood()) return;

    setChanging(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        primary_neighborhood_id: neighborhoodId,
        last_neighborhood_change: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro ao trocar bairro", description: "Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Bairro principal alterado!", description: "Agora você pode interagir no novo bairro." });
      loadUserProfile();
    }

    setChanging(false);
  };

  const canChangeSecondaryNeighborhood = () => {
    if (!userProfile?.last_secondary_neighborhood_change) return true;
    const lastChange = new Date(userProfile.last_secondary_neighborhood_change);
    const daysSince = differenceInDays(new Date(), lastChange);
    return daysSince >= 45;
  };

  const daysUntilSecondaryChange = () => {
    if (!userProfile?.last_secondary_neighborhood_change) return 0;
    const lastChange = new Date(userProfile.last_secondary_neighborhood_change);
    const daysSince = differenceInDays(new Date(), lastChange);
    return Math.max(0, 45 - daysSince);
  };

  const handleSetSecondaryNeighborhood = async (neighborhoodId: string) => {
    if (!user || !canChangeSecondaryNeighborhood()) return;

    setSettingSecondary(true);

    const { error } = await supabase
      .from("profiles")
      .update({ 
        secondary_neighborhood_id: neighborhoodId,
        last_secondary_neighborhood_change: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível definir o segundo bairro.", variant: "destructive" });
    } else {
      toast({ title: "Segundo bairro definido!", description: "Você agora pode interagir em 2 bairros." });
      loadUserProfile();
    }

    setSettingSecondary(false);
  };

  const handleRemoveSecondaryNeighborhood = async () => {
    if (!user) return;

    setSettingSecondary(true);

    const { error } = await supabase
      .from("profiles")
      .update({ secondary_neighborhood_id: null })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível remover o segundo bairro.", variant: "destructive" });
    } else {
      toast({ title: "Segundo bairro removido" });
      loadUserProfile();
    }

    setSettingSecondary(false);
  };

  const filteredNeighborhoods = neighborhoods.filter(
    (n) =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNeighborhoodName = (id: string | null) => {
    if (!id) return null;
    const n = neighborhoods.find(n => n.id === id);
    return n ? `${n.name}, ${n.city}` : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead title="Bairros — Maridaas" description="Explore e participe de outras comunidades de bairro." noindex />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => navigate("/feed")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Bairros</h1>
              <p className="text-xs text-muted-foreground">Explore outras comunidades</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar bairro ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-32">
        {/* Current Neighborhoods */}
        {userProfile && (
          <div className="space-y-4 mb-6">
            {/* Primary Neighborhood */}
            <div className="card-maridaas p-4 border-2 border-primary">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-primary font-medium">Bairro principal</p>
                  <p className="font-semibold text-foreground">{userProfile.neighborhood}, {userProfile.city}</p>
                </div>
                <Star className="w-5 h-5 text-secondary fill-secondary" />
              </div>
              {!canChangeNeighborhood() && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <Lock className="w-4 h-4" />
                  <span>Você poderá trocar novamente em {daysUntilChange()} dias</span>
                </div>
              )}
            </div>

            {/* Secondary Neighborhood */}
            <div className="card-maridaas p-4 border-2 border-accent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-accent-foreground font-medium">Segundo bairro</p>
                  {userProfile.secondary_neighborhood_id ? (
                    <p className="font-semibold text-foreground">
                      {getNeighborhoodName(userProfile.secondary_neighborhood_id)}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum definido</p>
                  )}
                </div>
                {userProfile.secondary_neighborhood_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveSecondaryNeighborhood}
                    disabled={settingSecondary || !canChangeSecondaryNeighborhood()}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {!canChangeSecondaryNeighborhood() && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <Lock className="w-4 h-4" />
                  <span>Você poderá trocar novamente em {daysUntilSecondaryChange()} dias</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Você pode interagir em até 2 bairros simultaneamente. Troca permitida a cada 45 dias.
              </p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            <strong>Atenção:</strong> Você pode postar e interagir nos seus bairros fixos.
            É possível visitar outros bairros, mas a troca do bairro principal só pode ser feita a cada 45 dias.
          </p>
        </div>

        {/* Neighborhoods List */}
        <div className="space-y-3">
          {filteredNeighborhoods.map((n) => {
            const isPrimary = n.id === userProfile?.primary_neighborhood_id;
            const isSecondary = n.id === userProfile?.secondary_neighborhood_id;
            
            return (
              <div
                key={n.id}
                className={`card-maridaas p-4 ${isPrimary ? "border-primary bg-primary/5" : isSecondary ? "border-accent bg-accent/5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{n.name}</p>
                        {isPrimary && <Star className="w-4 h-4 text-secondary fill-secondary" />}
                        {isSecondary && <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">2º</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.city}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{n.member_count} {n.member_count === 1 ? "membro" : "membros"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {isPrimary ? (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                        Principal
                      </span>
                    ) : isSecondary ? (
                      <span className="text-xs font-medium text-accent-foreground bg-accent/10 px-3 py-1 rounded-full">
                        Segundo
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/neighborhoods/${n.id}`)}
                        >
                          Visitar
                        </Button>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canChangeNeighborhood() || changing}
                            onClick={() => handleChangeNeighborhood(n.id)}
                            className="text-xs px-2"
                          >
                            Principal
                          </Button>
                          {(!userProfile?.secondary_neighborhood_id || canChangeSecondaryNeighborhood()) && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={settingSecondary || !canChangeSecondaryNeighborhood()}
                              onClick={() => handleSetSecondaryNeighborhood(n.id)}
                              className="text-xs px-2"
                            >
                              2º Bairro
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNeighborhoods.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum bairro encontrado</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Neighborhoods;
