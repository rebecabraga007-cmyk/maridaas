import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/safeClient";
import { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  MapPin,
  Eye,
  Lock,
} from "lucide-react";
import ServiceClickableCard from "@/components/ServiceClickableCard";
import PostCard from "@/components/PostCard";

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
  avatar_url: string | null;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
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
  const [canInteract, setCanInteract] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (user && neighborhoodId) {
      loadData();
    }
  }, [user, neighborhoodId]);

  const loadData = async () => {
    setLoading(true);

    const [profileRes, rolesRes, neighborhoodRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("primary_neighborhood_id, secondary_neighborhood_id")
        .eq("user_id", user!.id)
        .single(),
      supabase
        .from("user_roles")
        .select("role, moderator_neighborhood_id")
        .eq("user_id", user!.id),
      supabase
        .from("neighborhoods")
        .select("id, name, city")
        .eq("id", neighborhoodId)
        .single(),
    ]);

    // Roles
    let userIsAdmin = false;
    let userIsModerator = false;
    if (rolesRes.data) {
      const roles = rolesRes.data;
      userIsAdmin = roles.some((r) => r.role === "admin");
      userIsModerator = roles.some(
        (r) =>
          r.role === "moderator" &&
          (r.moderator_neighborhood_id === neighborhoodId || r.moderator_neighborhood_id === null)
      );
      setIsAdmin(userIsAdmin);
      setIsModerator(userIsModerator);
    }

    if (profileRes.data) {
      const profile = profileRes.data;
      const userCanInteract =
        userIsAdmin ||
        profile.primary_neighborhood_id === neighborhoodId ||
        profile.secondary_neighborhood_id === neighborhoodId;
      setCanInteract(userCanInteract);
    } else if (userIsAdmin) {
      setCanInteract(true);
    }

    if (neighborhoodRes.data) {
      setNeighborhood(neighborhoodRes.data);
    }

    // Load posts and services in parallel
    const [postsRes, servicesRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, content, created_at, user_id, image_url")
        .eq("neighborhood_id", neighborhoodId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.rpc("get_services_with_details", { _neighborhood_id: neighborhoodId }),
    ]);

    // Services — single RPC, no N+1
    if (servicesRes.data) {
      setServices(
        servicesRes.data.map((s: any) => ({
          id: s.id,
          title: s.title,
          owner_name: s.owner_name,
          avg_rating: s.avg_rating,
        }))
      );
    }

    // Posts — batch profile lookups + bulk likes/comments
    if (postsRes.data && postsRes.data.length > 0) {
      const postIds = postsRes.data.map((p) => p.id);
      const uniqueUserIds = [...new Set(postsRes.data.map((p) => p.user_id))];

      const [profileResults, likesRes, commentsRes] = await Promise.all([
        Promise.all(
          uniqueUserIds.map((uid) => supabase.rpc("get_public_profile", { target_user_id: uid }))
        ),
        supabase.from("post_likes").select("post_id").in("post_id", postIds),
        supabase.from("post_comments").select("post_id").in("post_id", postIds),
      ]);

      const profilesMap = new Map(
        profileResults.flatMap((r, i) =>
          r.data?.[0] ? [[uniqueUserIds[i], r.data[0]]] : []
        )
      );

      const likesMap = new Map<string, number>();
      for (const like of likesRes.data || []) {
        likesMap.set(like.post_id, (likesMap.get(like.post_id) || 0) + 1);
      }

      const commentsMap = new Map<string, number>();
      for (const comment of commentsRes.data || []) {
        commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1);
      }

      setPosts(
        postsRes.data.map((post) => {
          const profile = profilesMap.get(post.user_id) as any;
          return {
            ...post,
            author: profile?.full_name || "Usuária",
            avatar_url: profile?.avatar_url || null,
            likes_count: likesMap.get(post.id) || 0,
            comments_count: commentsMap.get(post.id) || 0,
          };
        })
      );
    } else {
      setPosts([]);
    }

    setLoading(false);
  };

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
                <h1 className="text-lg font-display font-bold text-foreground">{neighborhood.name}</h1>
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
        {!canInteract && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-accent-foreground flex-shrink-0" />
            <p className="text-sm text-accent-foreground">
              Você está visualizando este bairro. Para interagir, defina-o como seu bairro principal ou
              secundário.
            </p>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Serviços do bairro</h2>
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

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Mural do bairro</h2>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma postagem neste bairro</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    id: post.id,
                    author: post.author,
                    content: post.content,
                    createdAt: new Date(post.created_at),
                    likes: post.likes_count,
                    comments: post.comments_count,
                    userId: post.user_id,
                    avatarUrl: post.avatar_url,
                    imageUrl: post.image_url,
                    neighborhoodId: neighborhoodId,
                  }}
                  currentUserId={user?.id}
                  onLikeChange={loadData}
                  onPostDeleted={loadData}
                  onPostUpdated={loadData}
                  isVisitor={!canInteract}
                  canModerate={isAdmin || isModerator}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default NeighborhoodView;
