import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  User as UserIcon,
  MapPin,
  Briefcase,
  Star,
  Sparkles,
  Crown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import CreateServiceModal from "@/components/CreateServiceModal";
import ServiceDetailModal from "@/components/ServiceDetailModal";
import SEOHead from "@/components/SEOHead";
import ServiceSkeleton from "@/components/ServiceSkeleton";
import { useServices, type Service } from "@/hooks/useServices";

const SERVICE_CATEGORIES = [
  "Todas",
  "Diarista",
  "Cuidadora",
  "Costureira",
  "Cozinheira",
  "Manicure",
  "Cabeleireira",
  "Pet Care",
  "Aulas",
  "Outros"
];

export default function ServicesView() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
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
  } = useServices();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredServices = useMemo(() => {
    let filtered = services;
    
    // Filter by category
    if (selectedCategory !== "Todas") {
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        s.description?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    
    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (s) => s.title.toLowerCase().includes(q) || s.owner_name.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [services, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead
        title="Serviços — Maridaas"
        description="Encontre serviços de confiança no seu bairro. Diaristas, cuidadoras, costureiras e muito mais."
        noindex
      />
      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          currentUserId={user?.id}
          userNeighborhoodId={userProfile?.primary_neighborhood_id}
          onClose={() => setSelectedService(null)}
          onUpdate={reloadServices}
          isAdmin={isAdmin}
          isModerator={isModerator}
        />
      )}

      {showCreateModal && (
        <CreateServiceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            reloadServices();
            toast({
              title: "Serviço cadastrado!",
              description: "Seu serviço está disponível para vizinhas.",
            });
          }}
        />
      )}

      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => navigate("/feed")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Serviços</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {locationLabel}
              </p>
            </div>
            <div className="flex-1" />
            {checkingPremium ? (
              <Button size="sm" disabled className="btn-maridaas">
                <Plus className="w-4 h-4 mr-1" /> Cadastrar
              </Button>
            ) : isPremium ? (
              <Button size="sm" className="btn-maridaas" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Cadastrar
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-gradient-to-r from-secondary to-primary text-primary-foreground"
                onClick={() => navigate("/premium")}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Premium
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar serviço ou prestadora..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-36">
        {!checkingPremium && !isPremium && (
          <div className="mb-6 card-maridaas p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-secondary to-primary flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-lg text-foreground mb-1">Ofereça seus serviços</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Assine o Maridaas Premium por apenas R$ 29,90/mês e cadastre seus serviços para toda a vizinhança!
                </p>
                <Button
                  className="bg-gradient-to-r from-secondary to-primary text-primary-foreground"
                  onClick={() => navigate("/premium")}
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Assinar Premium
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServiceSkeleton key={i} />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== "Todas" 
                ? "Nenhum serviço encontrado para os filtros selecionados" 
                : "Nenhum serviço cadastrado no bairro ainda."
              }
            </p>
            {searchQuery || selectedCategory !== "Todas" ? (
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Todas");
                }}
              >
                Limpar filtros
              </Button>
            ) : isPremium ? (
              <Button className="btn-maridaas mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" /> Seja a primeira!
              </Button>
            ) : (
              <Button
                className="bg-gradient-to-r from-secondary to-primary text-primary-foreground mt-4"
                onClick={() => navigate("/premium")}
              >
                <Sparkles className="w-4 h-4 mr-2" /> Assinar Premium
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredServices.map((service) => {
              const displayImage = service.image_url || service.owner_avatar;
              return (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className="card-maridaas p-4 text-left w-full hover:border-primary transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {displayImage ? (
                        <img src={displayImage} alt={service.title} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-7 h-7 text-muted-foreground" />
                      )}
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
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
