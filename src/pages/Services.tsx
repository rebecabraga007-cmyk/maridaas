import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Search,
  User as UserIcon,
  MapPin,
  Home,
  Briefcase,
  Star,
} from "lucide-react";
import ServiceDetailModal from "@/components/ServiceDetailModal";
import CreateServiceModal from "@/components/CreateServiceModal";

interface Service {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  whatsapp: string | null;
  instagram: string | null;
  owner_name: string;
  avg_rating: number;
  review_count: number;
}

interface Profile {
  primary_neighborhood_id: string | null;
  neighborhood: string;
  city: string;
}

const Services = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    if (user) loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (userProfile?.primary_neighborhood_id) loadServices();
  }, [userProfile?.primary_neighborhood_id]);

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("primary_neighborhood_id, neighborhood, city")
      .eq("user_id", user.id)
      .single();

    if (data) setUserProfile(data);
  };

  const loadServices = async () => {
    if (!userProfile?.primary_neighborhood_id) return;

    const { data } = await supabase
      .from("services")
      .select("id, title, description, user_id, whatsapp, instagram")
      .eq("neighborhood_id", userProfile.primary_neighborhood_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data) {
      const servicesWithDetails = await Promise.all(
        data.map(async (service) => {
          const [profileRes, reviewsRes] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("user_id", service.user_id).single(),
            supabase.from("service_reviews").select("rating").eq("service_id", service.id),
          ]);
          const reviews = reviewsRes.data || [];
          const avgRating = reviews.length > 0
            ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
            : 0;
          return {
            ...service,
            owner_name: profileRes.data?.full_name || "Prestadora",
            avg_rating: Math.round(avgRating * 10) / 10,
            review_count: reviews.length,
          };
        })
      );
      setServices(servicesWithDetails);
    }
  };

  const filteredServices = services.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
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
      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          currentUserId={user?.id}
          userNeighborhoodId={userProfile?.primary_neighborhood_id}
          onClose={() => setSelectedService(null)}
          onUpdate={loadServices}
        />
      )}

      {showCreateModal && (
        <CreateServiceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadServices();
            toast({ title: "Serviço cadastrado!", description: "Seu serviço está disponível para vizinhas." });
          }}
        />
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => navigate("/feed")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Serviços</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />{userProfile?.neighborhood}, {userProfile?.city}
              </p>
            </div>
            <div className="flex-1" />
            <Button size="sm" className="btn-maridaas" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Cadastrar
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar serviço ou prestadora..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-36">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado no bairro ainda."}
            </p>
            <Button className="btn-maridaas mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Seja a primeira!
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="card-maridaas p-4 text-left w-full hover:border-primary transition-colors"
              >
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{service.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{service.owner_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-secondary fill-secondary" />
                        <span className="text-sm font-medium">{service.avg_rating || "—"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({service.review_count} avaliações)</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-40">
        <div className="container mx-auto px-4 flex items-center justify-around py-2">
          <NavItem icon={<Home className="w-6 h-6" />} label="Início" onClick={() => navigate("/feed")} />
          <NavItem icon={<Briefcase className="w-6 h-6" />} label="Serviços" active />
          <NavItem icon={<MapPin className="w-6 h-6" />} label="Bairros" onClick={() => navigate("/neighborhoods")} />
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

export default Services;
