import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  MapPin,
  Instagram,
  MessageCircle,
  Star,
  Briefcase,
} from "lucide-react";

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

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadServices();
    }
  }, [userId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, bio, neighborhood, city, instagram, whatsapp, avatar_url")
      .eq("user_id", userId)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("id, title")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (data) {
      const servicesWithRatings = await Promise.all(
        data.map(async (service) => {
          const { data: reviews } = await supabase
            .from("service_reviews")
            .select("rating")
            .eq("service_id", service.id);
          const avgRating =
            reviews && reviews.length > 0
              ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
              : 0;
          return { ...service, avg_rating: Math.round(avgRating * 10) / 10 };
        })
      );
      setServices(servicesWithRatings);
    }
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">Perfil</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Avatar e Info */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-white" />
            )}
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">
            {profile.full_name}
          </h2>
          <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
            <MapPin className="w-4 h-4" />
            <span>
              {profile.neighborhood}, {profile.city}
            </span>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="card-maridaas p-4 mb-4">
            <p className="text-foreground">{profile.bio}</p>
          </div>
        )}

        {/* Redes sociais */}
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

        {/* Serviços */}
        {services.length > 0 && (
          <div>
            <h3 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Serviços oferecidos
            </h3>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="card-maridaas p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{service.title}</p>
                    {service.avg_rating > 0 && (
                      <div className="flex items-center gap-1 text-secondary">
                        <Star className="w-4 h-4 fill-secondary" />
                        <span className="text-sm font-medium">{service.avg_rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;
