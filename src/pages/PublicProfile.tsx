import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/safeClient";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  MapPin,
  Instagram,
  MessageCircle,
  Briefcase,
} from "lucide-react";
import ServiceClickableCard from "@/components/ServiceClickableCard";

interface Profile {
  full_name: string;
  bio: string | null;
  neighborhood: string;
  city: string;
  instagram: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
}

interface Service {
  id: string;
  title: string;
  avg_rating: number;
}

const PublicProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setAuthenticated(true);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (userId && authenticated) {
      loadProfile();
      loadServices();
    }
  }, [userId, authenticated]);

  const loadProfile = async () => {
    const { data } = await supabase.rpc("get_public_profile", { target_user_id: userId });
    if (data && data.length > 0) setProfile(data[0]);
    setLoading(false);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("id, title")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!data || data.length === 0) {
      setServices([]);
      return;
    }

    const serviceIds = data.map((s) => s.id);
    const { data: allReviews } = await supabase
      .from("service_reviews")
      .select("service_id, rating")
      .in("service_id", serviceIds);

    const reviewsMap = new Map<string, number[]>();
    for (const review of allReviews || []) {
      if (!reviewsMap.has(review.service_id)) reviewsMap.set(review.service_id, []);
      reviewsMap.get(review.service_id)!.push(review.rating || 0);
    }

    setServices(
      data.map((service) => {
        const ratings = reviewsMap.get(service.id) || [];
        const avgRating =
          ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        return { ...service, avg_rating: Math.round(avgRating * 10) / 10 };
      })
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Perfil não encontrado</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">Perfil</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`Foto de ${profile.full_name}`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-white" />
            )}
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">{profile.full_name}</h2>
          <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
            <MapPin className="w-4 h-4" />
            <span>
              {profile.neighborhood}, {profile.city}
            </span>
          </div>
        </div>

        {profile.bio && (
          <div className="card-maridaas p-4 mb-4">
            <p className="text-foreground">{profile.bio}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center mb-6">
          {profile.instagram && (
            <a
              href={`https://instagram.com/${profile.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span className="text-sm font-medium">{profile.instagram}</span>
            </a>
          )}
          {profile.whatsapp && (
            <a
              href={`https://wa.me/55${profile.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">WhatsApp</span>
            </a>
          )}
        </div>

        {services.length > 0 && (
          <div>
            <h3 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Serviços oferecidos
            </h3>
            <div className="space-y-3">
              {services.map((service) => (
                <ServiceClickableCard
                  key={service.id}
                  serviceId={service.id}
                  title={service.title}
                  ownerName={profile.full_name}
                  avgRating={service.avg_rating}
                />
              ))}
            </div>
          </div>
        )}

        {services.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum serviço cadastrado</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;
