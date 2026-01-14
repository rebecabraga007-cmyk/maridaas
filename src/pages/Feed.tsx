import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Home, 
  User as UserIcon, 
  Bell, 
  Send,
  ChevronRight,
  ChevronDown,
  LogOut,
  Briefcase,
  Plus,
  Search,
  Shield,
  Mail,
  ImagePlus,
  X,
  Star,
} from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import PostCard from "@/components/PostCard";
import OnboardingModal from "@/components/OnboardingModal";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NotificationPrompt from "@/components/NotificationPrompt";
import UserSearchModal from "@/components/UserSearchModal";
import ImageUpload from "@/components/ImageUpload";

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
  const [services, setServices] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [posting, setPosting] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
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
        // Show notification prompt after onboarding or if permission not granted
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
      setIsAdmin(data.some(r => r.role === "admin"));
      setIsModerator(data.some(r => r.role === "moderator"));
    }
  };

  const registerSession = async () => {
    if (!user) return;
    await supabase.from("user_sessions").upsert(
      { user_id: user.id, session_date: new Date().toISOString().split("T")[0] },
      { onConflict: "user_id,session_date" }
    );
  };

  // Get the currently selected neighborhood ID
  const currentNeighborhoodId = selectedNeighborhood === "secondary" && userProfile?.secondary_neighborhood_id
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
    
    // Fetch all active announcements and sort properly
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .lte("starts_at", new Date().toISOString())
      .order("is_global", { ascending: false }) // Global first
      .order("created_at", { ascending: false });

    if (data) {
      // Filter to active announcements for this user
      const activeAnnouncements = data.filter(a => {
        if (a.ends_at && new Date(a.ends_at) <= new Date()) return false;
        if (a.is_global) return true;
        if (a.neighborhood_id === currentNeighborhoodId) return true;
        if (a.target_user_id === user.id) return true;
        return false;
      });
      
      // Set all announcements (global ones first, then specific)
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
      
      // Load neighborhood names
      const neighborhoodIds = [data.primary_neighborhood_id, data.secondary_neighborhood_id].filter(Boolean);
      if (neighborhoodIds.length > 0) {
        const { data: neighborhoods } = await supabase
          .from("neighborhoods")
          .select("id, name, city")
          .in("id", neighborhoodIds);
        
        if (neighborhoods) {
          const primary = neighborhoods.find(n => n.id === data.primary_neighborhood_id) || null;
          const secondary = neighborhoods.find(n => n.id === data.secondary_neighborhood_id) || null;
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

    // Count unread messages
    const { count: messagesCount } = await supabase
      .from("user_messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .is("read_at", null);

    // Count pending friend requests
    const { count: requestsCount } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    setUnreadCounts({
      messages: messagesCount || 0,
      requests: requestsCount || 0,
    });
  };

  const loadPosts = async () => {
    if (!currentNeighborhoodId) return;

    const { data } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url")
      .eq("neighborhood_id", currentNeighborhoodId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const postsWithDetails = await Promise.all(
        data.map(async (post) => {
          const [profileRes, likesRes, commentsRes] = await Promise.all([
            supabase.rpc("get_public_profile", { target_user_id: post.user_id }),
            supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", post.id),
            supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", post.id),
          ]);
          const profileData = profileRes.data?.[0];
          return {
            ...post,
            author: profileData?.full_name || "Usuária",
            avatar_url: profileData?.avatar_url || null,
            image_url: post.image_url,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
          };
        })
      );
      setPosts(postsWithDetails);
    }
  };

  const loadServices = async () => {
    if (!currentNeighborhoodId) return;

    const { data } = await supabase
      .from("services")
      .select("id, title, user_id, image_url")
      .eq("neighborhood_id", currentNeighborhoodId)
      .eq("is_active", true)
      .limit(10);

    if (data) {
      const servicesWithDetails = await Promise.all(
        data.map(async (service) => {
          const [profileRes, reviewsRes] = await Promise.all([
            supabase.rpc("get_public_profile", { target_user_id: service.user_id }),
            supabase.from("service_reviews").select("rating").eq("service_id", service.id),
          ]);
          const profileData = profileRes.data?.[0];
          const reviews = reviewsRes.data || [];
          const avgRating = reviews.length > 0
            ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
            : 0;
          return {
            ...service,
            name: profileData?.full_name || "Prestadora",
            avatar_url: profileData?.avatar_url || null,
            image_url: service.image_url,
            avg_rating: Math.round(avgRating * 10) / 10,
          };
        })
      );
      setServices(servicesWithDetails);
    }
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
      {showOnboarding && <OnboardingModal onClose={() => { setShowOnboarding(false); localStorage.setItem("maridaas_onboarding_seen", "true"); }} />}

      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Maridaas" className="h-8 w-8" />
            <div>
              {/* Neighborhood Selector */}
              {userProfile?.secondary_neighborhood_id && neighborhoodInfo.secondary ? (
                <div className="relative">
                  <button
                    onClick={() => setSelectedNeighborhood(prev => prev === "primary" ? "secondary" : "primary")}
                    className="flex items-center gap-2 group"
                  >
                    <div className="flex items-center gap-1">
                      {selectedNeighborhood === "primary" && <Star className="w-3 h-3 text-secondary fill-secondary" />}
                      <h1 className="text-lg font-display font-bold text-foreground">
                        {selectedNeighborhood === "primary" 
                          ? (neighborhoodInfo.primary?.name || userProfile?.neighborhood || "Seu Bairro")
                          : neighborhoodInfo.secondary.name}
                      </h1>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedNeighborhood === "primary"
                      ? (neighborhoodInfo.primary?.city || userProfile?.city || "Sua Cidade")
                      : neighborhoodInfo.secondary.city}
                    <span className="ml-1 text-primary">
                      • Toque para alternar
                    </span>
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
            <Button variant="ghost" size="icon" onClick={() => setShowUserSearch(true)}><Search className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/inbox")} className="relative">
              <Mail className="h-5 w-5" />
              {(unreadCounts.messages + unreadCounts.requests) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCounts.messages + unreadCounts.requests}
                </span>
              )}
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-secondary">
                <Shield className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
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
            <button onClick={() => navigate("/services")} className="text-sm text-primary flex items-center gap-1">Ver todos <ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {services.map((s) => <ServiceCard key={s.id} service={{ id: s.id, name: s.name, service: s.title, rating: s.avg_rating, image_url: s.image_url, avatar_url: s.avatar_url }} />)}
            <button onClick={() => navigate("/services")} className="flex-shrink-0 w-28 h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="w-6 h-6" /><span className="text-xs">Cadastrar</span>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Mural do bairro</h2>
          <div className="card-maridaas p-4 mb-4">
            <div className="flex gap-3">
              <div className="avatar-maridaas flex-shrink-0"><UserIcon className="w-5 h-5" /></div>
              <div className="flex-1">
                <Textarea placeholder="O que está acontecendo no bairro?" value={postContent} onChange={(e) => setPostContent(e.target.value)} className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-0 rounded-xl" maxLength={240} />
                
                {/* Image preview */}
                {postImageUrl && (
                  <div className="relative mt-3 rounded-xl overflow-hidden">
                    <img src={postImageUrl} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      onClick={() => { setPostImageUrl(""); setShowImageUpload(false); }}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Image upload section */}
                {showImageUpload && !postImageUrl && (
                  <div className="mt-3">
                    <ImageUpload
                      userId={user?.id || ""}
                      folder="posts"
                      onImageUploaded={(url) => { setPostImageUrl(url); if (url) setShowImageUpload(false); }}
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImageUpload(!showImageUpload)}
                      className={`p-2 rounded-lg transition-colors ${showImageUpload ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-muted'}`}
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>
                    <span className={`text-xs ${postContent.length > 200 ? 'text-destructive' : 'text-muted-foreground'}`}>{postContent.length}/240</span>
                  </div>
                  <Button onClick={handlePost} size="sm" className="btn-maridaas" disabled={!postContent.trim() || posting}><Send className="w-4 h-4 mr-2" />{posting ? "..." : "Publicar"}</Button>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {posts.map((p) => <PostCard key={p.id} post={{ id: p.id, author: p.author, content: p.content, createdAt: new Date(p.created_at), likes: p.likes_count, comments: p.comments_count, userId: p.user_id, avatarUrl: p.avatar_url, imageUrl: p.image_url }} currentUserId={user?.id} onLikeChange={loadPosts} onPostDeleted={loadPosts} onPostUpdated={loadPosts} canModerate={isAdmin || isModerator} />)}
            {posts.length === 0 && <div className="text-center py-12 text-muted-foreground"><p>Nenhuma postagem ainda. Seja a primeira!</p></div>}
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-40">
        <div className="container mx-auto px-4 flex items-center justify-around py-2">
          <NavItem icon={<Home className="w-6 h-6" />} label="Início" active />
          <NavItem icon={<Briefcase className="w-6 h-6" />} label="Serviços" onClick={() => navigate("/services")} />
          <NavItem icon={<MapPin className="w-6 h-6" />} label="Bairros" onClick={() => navigate("/neighborhoods")} />
          <NavItem icon={<UserIcon className="w-6 h-6" />} label="Perfil" onClick={() => navigate("/profile")} />
        </div>
      </nav>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
    {icon}<span className="text-xs font-medium">{label}</span>
  </button>
);

export default Feed;