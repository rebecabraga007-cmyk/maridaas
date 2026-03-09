import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  User as UserIcon,
  Bell,
  Send,
  ChevronRight,
  ChevronDown,
  LogOut,
  Plus,
  Search,
  Shield,
  Mail,
  ImagePlus,
  X,
  Star,
  Loader2,
} from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import PostCard from "@/components/PostCard";
import OnboardingModal from "@/components/OnboardingModal";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NotificationPrompt from "@/components/NotificationPrompt";
import UserSearchModal from "@/components/UserSearchModal";
import ImageUpload from "@/components/ImageUpload";
import NotificationSettingsModal from "@/components/NotificationSettingsModal";
import BottomNav from "@/components/BottomNav";
import SEOHead from "@/components/SEOHead";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Profile {
  full_name: string;
  neighborhood: string;
  city: string;
  primary_neighborhood_id: string | null;
  secondary_neighborhood_id: string | null;
  avatar_url: string | null;
}

interface NeighborhoodInfo {
  id: string;
  name: string;
  city: string;
}

interface UnreadCounts {
  messages: number;
  requests: number;
}

const Feed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImageUrl, setPostImageUrl] = useState<string>("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 20;
  const [services, setServices] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [posting, setPosting] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ messages: 0, requests: 0 });
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<"primary" | "secondary">("primary");
  const [neighborhoodInfo, setNeighborhoodInfo] = useState<{ primary: NeighborhoodInfo | null; secondary: NeighborhoodInfo | null }>({ primary: null, secondary: null });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
        if (!localStorage.getItem("maridaas_onboarding_seen")) {
          setShowOnboarding(true);
        }
        if ("Notification" in window && Notification.permission === "default") {
          setTimeout(() => {
            if (!localStorage.getItem("maridaas_notification_dismissed")) {
              setShowNotificationPrompt(true);
            }
          }, 2000);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      checkAdminRole();
      registerSession();
      loadUnreadCounts();
    }
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role, moderator_neighborhood_id")
      .eq("user_id", user.id);

    if (data) {
      setIsAdmin(data.some((r) => r.role === "admin"));
      setIsModerator(data.some((r) => r.role === "moderator"));
    }
  };

  const registerSession = async () => {
    if (!user) return;
    await supabase.from("user_sessions").upsert(
      { user_id: user.id, session_date: new Date().toISOString().split("T")[0] },
      { onConflict: "user_id,session_date" }
    );
  };

  const currentNeighborhoodId =
    selectedNeighborhood === "secondary" && userProfile?.secondary_neighborhood_id
      ? userProfile.secondary_neighborhood_id
      : userProfile?.primary_neighborhood_id;

  useEffect(() => {
    if (currentNeighborhoodId) {
      loadPosts();
      loadServices();
      loadAnnouncements();
    }
  }, [currentNeighborhoodId]);

  const loadAnnouncements = async () => {
    if (!user || !currentNeighborhoodId) return;

    const { data } = await supabase
      .from("announcements")
      .select("*")
      .lte("starts_at", new Date().toISOString())
      .order("is_global", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      const activeAnnouncements = data.filter((a) => {
        if (a.ends_at && new Date(a.ends_at) <= new Date()) return false;
        if (a.is_global) return true;
        if (a.neighborhood_id === currentNeighborhoodId) return true;
        if (a.target_user_id === user.id) return true;
        return false;
      });
      setAnnouncements(activeAnnouncements);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, neighborhood, city, primary_neighborhood_id, secondary_neighborhood_id, avatar_url")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setUserProfile(data);

      const neighborhoodIds = [data.primary_neighborhood_id, data.secondary_neighborhood_id].filter(Boolean);
      if (neighborhoodIds.length > 0) {
        const { data: neighborhoods } = await supabase
          .from("neighborhoods")
          .select("id, name, city")
          .in("id", neighborhoodIds);

        if (neighborhoods) {
          const primary = neighborhoods.find((n) => n.id === data.primary_neighborhood_id) || null;
          const secondary = neighborhoods.find((n) => n.id === data.secondary_neighborhood_id) || null;
          setNeighborhoodInfo({ primary, secondary });
        }
      }
    } else {
      const m = user.user_metadata;
      setUserProfile({
        full_name: m?.full_name || "Usuária",
        neighborhood: m?.neighborhood || "Bairro",
        city: m?.city || "Cidade",
        primary_neighborhood_id: null,
        secondary_neighborhood_id: null,
        avatar_url: null,
      });
    }
  };

  const loadUnreadCounts = async () => {
    if (!user) return;

    const [messagesRes, requestsRes] = await Promise.all([
      supabase
        .from("user_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("read_at", null),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending"),
    ]);

    setUnreadCounts({
      messages: messagesRes.count || 0,
      requests: requestsRes.count || 0,
    });
  };

  // Optimized: batch profile lookups + single bulk queries for likes/comments
  const loadPosts = async () => {
    if (!currentNeighborhoodId) return;

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url")
      .eq("neighborhood_id", currentNeighborhoodId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar as postagens.", variant: "destructive" });
      return;
    }

    if (!data || data.length === 0) {
      setPosts([]);
      return;
    }

    const postIds = data.map((p) => p.id);
    const uniqueUserIds = [...new Set(data.map((p) => p.user_id))];

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
      data.map((post) => {
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
  };

  // Optimized: single RPC replaces N+1 profile+review calls
  const loadServices = async () => {
    if (!currentNeighborhoodId) return;

    const { data } = await supabase.rpc("get_services_with_details", {
      _neighborhood_id: currentNeighborhoodId,
    });

    setServices((data || []).slice(0, 10));
  };

  const handlePost = async () => {
    if (!postContent.trim() || !user || !currentNeighborhoodId) return;
    if (postContent.length > 240) {
      toast({ title: "Texto muito longo", description: "O limite é de 240 caracteres.", variant: "destructive" });
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      neighborhood_id: currentNeighborhoodId,
      content: postContent.trim(),
      image_url: postImageUrl || null,
    });
    if (error) {
      toast({ title: "Erro ao publicar", description: "Tente novamente.", variant: "destructive" });
    } else {
      setPostContent("");
      setPostImageUrl("");
      setShowImageUpload(false);
      toast({ title: "Publicado!", description: "Sua postagem foi compartilhada." });
      loadPosts();
    }
    setPosting(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {showOnboarding && (
        <OnboardingModal
          onClose={() => {
            setShowOnboarding(false);
            localStorage.setItem("maridaas_onboarding_seen", "true");
          }}
        />
      )}
      {showNotificationSettings && (
        <NotificationSettingsModal onClose={() => setShowNotificationSettings(false)} />
      )}

      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Maridaas" className="h-8 w-8" />
            <div>
              {userProfile?.secondary_neighborhood_id && neighborhoodInfo.secondary ? (
                <div className="relative">
                  <button
                    onClick={() =>
                      setSelectedNeighborhood((prev) => (prev === "primary" ? "secondary" : "primary"))
                    }
                    className="flex items-center gap-2 group"
                  >
                    <div className="flex items-center gap-1">
                      {selectedNeighborhood === "primary" && (
                        <Star className="w-3 h-3 text-secondary fill-secondary" />
                      )}
                      <h1 className="text-lg font-display font-bold text-foreground">
                        {selectedNeighborhood === "primary"
                          ? neighborhoodInfo.primary?.name || userProfile?.neighborhood || "Seu Bairro"
                          : neighborhoodInfo.secondary.name}
                      </h1>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedNeighborhood === "primary"
                      ? neighborhoodInfo.primary?.city || userProfile?.city || "Sua Cidade"
                      : neighborhoodInfo.secondary.city}
                    <span className="ml-1 text-primary">• Toque para alternar</span>
                  </p>
                </div>
              ) : (
                <>
                  <h1 className="text-lg font-display font-bold text-foreground">
                    {neighborhoodInfo.primary?.name || userProfile?.neighborhood || "Seu Bairro"}
                  </h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {neighborhoodInfo.primary?.city || userProfile?.city || "Sua Cidade"}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowUserSearch(true)}>
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/inbox")} className="relative">
              <Mail className="h-5 w-5" />
              {unreadCounts.messages + unreadCounts.requests > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCounts.messages + unreadCounts.requests}
                </span>
              )}
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
                className="text-secondary"
              >
                <Shield className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowNotificationSettings(true)}>
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <UserSearchModal isOpen={showUserSearch} onClose={() => setShowUserSearch(false)} />

      <main className="container mx-auto px-4 pt-20">
        {showNotificationPrompt && (
          <NotificationPrompt
            onClose={() => {
              setShowNotificationPrompt(false);
              localStorage.setItem("maridaas_notification_dismissed", "true");
            }}
          />
        )}
        {announcements.map((ann) => (
          <AnnouncementBanner key={ann.id} announcement={ann} />
        ))}

        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-foreground">Serviços no bairro</h2>
            <button
              onClick={() => navigate("/services")}
              className="text-sm text-primary flex items-center gap-1"
            >
              Ver todos <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                service={{
                  id: s.id,
                  name: s.owner_name,
                  service: s.title,
                  rating: s.avg_rating,
                  image_url: s.image_url,
                  avatar_url: s.owner_avatar,
                }}
              />
            ))}
            <button
              onClick={() => navigate("/services")}
              className="flex-shrink-0 w-28 h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs">Cadastrar</span>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Mural do bairro</h2>
          <div className="card-maridaas p-4 mb-4">
            <div className="flex gap-3">
              <div className="avatar-maridaas flex-shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <Textarea
                  placeholder="O que está acontecendo no bairro?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-0 rounded-xl"
                  maxLength={240}
                />

                {postImageUrl && (
                  <div className="relative mt-3 rounded-xl overflow-hidden">
                    <img src={postImageUrl} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      onClick={() => {
                        setPostImageUrl("");
                        setShowImageUpload(false);
                      }}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {showImageUpload && !postImageUrl && (
                  <div className="mt-3">
                    <ImageUpload
                      userId={user?.id || ""}
                      folder="posts"
                      onImageUploaded={(url) => {
                        setPostImageUrl(url);
                        if (url) setShowImageUpload(false);
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImageUpload(!showImageUpload)}
                      className={`p-2 rounded-lg transition-colors ${
                        showImageUpload
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-primary hover:bg-muted"
                      }`}
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>
                    <span
                      className={`text-xs ${
                        postContent.length > 200 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {postContent.length}/240
                    </span>
                  </div>
                  <Button
                    onClick={handlePost}
                    size="sm"
                    className="btn-maridaas"
                    disabled={!postContent.trim() || posting}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {posting ? "..." : "Publicar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={{
                  id: p.id,
                  author: p.author,
                  content: p.content,
                  createdAt: new Date(p.created_at),
                  likes: p.likes_count,
                  comments: p.comments_count,
                  userId: p.user_id,
                  avatarUrl: p.avatar_url,
                  imageUrl: p.image_url,
                }}
                currentUserId={user?.id}
                onLikeChange={loadPosts}
                onPostDeleted={loadPosts}
                onPostUpdated={loadPosts}
                canModerate={isAdmin || isModerator}
              />
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhuma postagem ainda. Seja a primeira!</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Feed;
