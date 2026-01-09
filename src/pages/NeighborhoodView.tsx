import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  MapPin,
  Eye,
  Lock,
  User as UserIcon,
} from "lucide-react";
import ServiceClickableCard from "@/components/ServiceClickableCard";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Neighborhood {
  id: string;
  name: string;
  city: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  author: string;
  user_id: string;
}

interface Service {
  id: string;
  title: string;
  owner_name: string;
  avg_rating: number;
}

const NeighborhoodView = () => {
  const navigate = useNavigate();
  const { neighborhoodId } = useParams<{ neighborhoodId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPrimaryNeighborhood, setUserPrimaryNeighborhood] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (user && neighborhoodId) {
      loadData();
    }
  }, [user, neighborhoodId]);

  const loadData = async () => {
    setLoading(true);

    // Load user's primary neighborhood
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_neighborhood_id")
      .eq("user_id", user!.id)
      .single();

    if (profile) {
      setUserPrimaryNeighborhood(profile.primary_neighborhood_id);
    }

    // Load neighborhood info
    const { data: neighborhoodData } = await supabase
      .from("neighborhoods")
      .select("id, name, city")
      .eq("id", neighborhoodId)
      .single();

    if (neighborhoodData) {
      setNeighborhood(neighborhoodData);
    }

    // Load posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id")
      .eq("neighborhood_id", neighborhoodId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsData) {
      const postsWithAuthors = await Promise.all(
        postsData.map(async (post) => {
          const { data: profileData } = await supabase
            .rpc("get_public_profile", { target_user_id: post.user_id });
          return {
            ...post,
            author: profileData?.[0]?.full_name || "Usuária",
          };
        })
      );
      setPosts(postsWithAuthors);
    }

    // Load services
    const { data: servicesData } = await supabase
      .from("services")
      .select("id, title, user_id")
      .eq("neighborhood_id", neighborhoodId)
      .eq("is_active", true)
      .limit(20);

    if (servicesData) {
      const servicesWithDetails = await Promise.all(
        servicesData.map(async (service) => {
          const [profileRes, reviewsRes] = await Promise.all([
            supabase.rpc("get_public_profile", { target_user_id: service.user_id }),
            supabase.from("service_reviews").select("rating").eq("service_id", service.id),
          ]);
          const profileData = profileRes.data?.[0];
          const reviews = reviewsRes.data || [];
          const avgRating =
            reviews.length > 0
              ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
              : 0;
          return {
            ...service,
            owner_name: profileData?.full_name || "Prestadora",
            avg_rating: Math.round(avgRating * 10) / 10,
          };
        })
      );
      setServices(servicesWithDetails);
    }

    setLoading(false);
  };

  const isOwnNeighborhood = userPrimaryNeighborhood === neighborhoodId;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  if (!neighborhood) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Bairro não encontrado</p>
        <button onClick={() => navigate("/neighborhoods")} className="btn-maridaas">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/neighborhoods")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-display font-bold text-foreground">
                  {neighborhood.name}
                </h1>
                <span className="flex items-center gap-1 text-xs bg-accent/20 text-accent-foreground px-2 py-1 rounded-full">
                  <Eye className="w-3 h-3" />
                  Visualização
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {neighborhood.city}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Aviso de modo visualização */}
        {!isOwnNeighborhood && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-accent-foreground flex-shrink-0" />
            <p className="text-sm text-accent-foreground">
              Você está visualizando este bairro. Para interagir, você precisa estar com ele como
              seu bairro principal.
            </p>
          </div>
        )}

        {/* Serviços */}
        <section className="mb-8">
          <h2 className="text-lg font-display font-bold text-foreground mb-4">
            Serviços do bairro
          </h2>
          {services.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum serviço cadastrado neste bairro
            </p>
          ) : (
            <div className="grid gap-3">
              {services.map((service) => (
                <ServiceClickableCard
                  key={service.id}
                  serviceId={service.id}
                  title={service.title}
                  ownerName={service.owner_name}
                  avgRating={service.avg_rating}
                />
              ))}
            </div>
          )}
        </section>

        {/* Posts */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-4">
            Mural do bairro
          </h2>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma postagem neste bairro
            </p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="card-maridaas p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{post.author}</span>
                        <span className="text-xs text-muted-foreground">
                          •{" "}
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default NeighborhoodView;
