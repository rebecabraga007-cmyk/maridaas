import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Search,
  MapPin,
  Home,
  Briefcase,
  User as UserIcon,
  Users,
  Lock,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Neighborhood {
  id: string;
  name: string;
  city: string;
  member_count: number;
}

interface Profile {
  primary_neighborhood_id: string | null;
  neighborhood: string;
  city: string;
  last_neighborhood_change: string | null;
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
      .select("primary_neighborhood_id, neighborhood, city, last_neighborhood_change")
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
      // Get member counts
      const neighborhoodsWithCounts = await Promise.all(
        data.map(async (n) => {
          const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("primary_neighborhood_id", n.id);
          return { ...n, member_count: count || 0 };
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
      toast({
        title: "Erro ao trocar bairro",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bairro alterado!",
        description: "Agora você pode interagir no novo bairro.",
      });
      loadUserProfile();
    }

    setChanging(false);
  };

  const filteredNeighborhoods = neighborhoods.filter(
    (n) =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
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
        {/* Current Neighborhood */}
        {userProfile && (
          <div className="card-maridaas p-4 mb-6 border-2 border-primary">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-primary font-medium">Seu bairro principal</p>
                <p className="font-semibold text-foreground">{userProfile.neighborhood}, {userProfile.city}</p>
              </div>
            </div>
            {!canChangeNeighborhood() && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                <Lock className="w-4 h-4" />
                <span>Você poderá trocar novamente em {daysUntilChange()} dias</span>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            <strong>Atenção:</strong> Você só pode postar e interagir no seu bairro principal. 
            É possível visualizar outros bairros, mas a troca do bairro principal só pode ser feita a cada 45 dias.
          </p>
        </div>

        {/* Neighborhoods List */}
        <div className="space-y-3">
          {filteredNeighborhoods.map((n) => {
            const isCurrentNeighborhood = n.id === userProfile?.primary_neighborhood_id;
            
            return (
              <div
                key={n.id}
                className={`card-maridaas p-4 ${isCurrentNeighborhood ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{n.name}</p>
                      <p className="text-sm text-muted-foreground">{n.city}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{n.member_count} {n.member_count === 1 ? "membro" : "membros"}</span>
                      </div>
                    </div>
                  </div>
                  {isCurrentNeighborhood ? (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                      Seu bairro
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canChangeNeighborhood() || changing}
                      onClick={() => handleChangeNeighborhood(n.id)}
                    >
                      {changing ? "..." : "Trocar"}
                    </Button>
                  )}
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-40">
        <div className="container mx-auto px-4 flex items-center justify-around py-2">
          <NavItem icon={<Home className="w-6 h-6" />} label="Início" onClick={() => navigate("/feed")} />
          <NavItem icon={<Briefcase className="w-6 h-6" />} label="Serviços" onClick={() => navigate("/services")} />
          <NavItem icon={<MapPin className="w-6 h-6" />} label="Bairros" active />
          <NavItem icon={<UserIcon className="w-6 h-6" />} label="Perfil" onClick={() => navigate("/profile")} />
        </div>
      </nav>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
  >
    {icon}<span className="text-xs font-medium">{label}</span>
  </button>
);

export default Neighborhoods;
