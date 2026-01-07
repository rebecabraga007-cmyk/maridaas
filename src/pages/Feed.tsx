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
  LogOut,
  Briefcase,
  Plus
} from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import PostCard from "@/components/PostCard";
import OnboardingModal from "@/components/OnboardingModal";
import AnnouncementBanner from "@/components/AnnouncementBanner";

interface Profile {
  full_name: string;
  neighborhood: string;
  city: string;
  primary_neighborhood_id: string | null;
}

const Feed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [posting, setPosting] = useState(false);

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
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (userProfile?.primary_neighborhood_id) {
      loadPosts();
      loadServices();
    }
  }, [userProfile?.primary_neighborhood_id]);

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, neighborhood, city, primary_neighborhood_id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setUserProfile(data);
    } else {
      const m = user.user_metadata;
      setUserProfile({
        full_name: m?.full_name || "Usuária",
        neighborhood: m?.neighborhood || "Bairro",
        city: m?.city || "Cidade",
        primary_neighborhood_id: null,
      });
    }
  };

  const loadPosts = async () => {
    if (!userProfile?.primary_neighborhood_id) return;

    const { data } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id")
      .eq("neighborhood_id", userProfile.primary_neighborhood_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const postsWithDetails = await Promise.all(
        data.map(async (post) => {
          const [profileRes, likesRes, commentsRes] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("user_id", post.user_id).single(),
            supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", post.id),
            supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", post.id),
          ]);
          return {
            ...post,
            author: profileRes.data?.full_name || "Usuária",
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
          };
        })
      );
      setPosts(postsWithDetails);
    }
  };

  const loadServices = async () => {
    if (!userProfile?.primary_neighborhood_id) return;

    const { data } = await supabase
      .from("services")
      .select("id, title, user_id")
      .eq("neighborhood_id", userProfile.primary_neighborhood_id)
      .eq("is_active", true)
      .limit(10);

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
            name: profileRes.data?.full_name || "Prestadora",
            avg_rating: Math.round(avgRating * 10) / 10,
          };
        })
      );
      setServices(servicesWithDetails);
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() || !user || !userProfile?.primary_neighborhood_id) return;
    if (postContent.length > 240) {
      toast({ title: "Texto muito longo", description: "O limite é de 240 caracteres.", variant: "destructive" });
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      neighborhood_id: userProfile.primary_neighborhood_id,
      content: postContent.trim(),
    });
    if (error) {
      toast({ title: "Erro ao publicar", description: "Tente novamente.", variant: "destructive" });
    } else {
      setPostContent("");
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
              <h1 className="text-lg font-display font-bold text-foreground">{userProfile?.neighborhood || "Seu Bairro"}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{userProfile?.city || "Sua Cidade"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {announcement && <AnnouncementBanner announcement={announcement} />}

        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-foreground">Serviços no bairro</h2>
            <button onClick={() => navigate("/services")} className="text-sm text-primary flex items-center gap-1">Ver todos <ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {services.map((s) => <ServiceCard key={s.id} service={{ id: s.id, name: s.name, service: s.title, rating: s.avg_rating }} />)}
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
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs ${postContent.length > 200 ? 'text-destructive' : 'text-muted-foreground'}`}>{postContent.length}/240</span>
                  <Button onClick={handlePost} size="sm" className="btn-maridaas" disabled={!postContent.trim() || posting}><Send className="w-4 h-4 mr-2" />{posting ? "..." : "Publicar"}</Button>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {posts.map((p) => <PostCard key={p.id} post={{ id: p.id, author: p.author, content: p.content, createdAt: new Date(p.created_at), likes: p.likes_count, comments: p.comments_count, userId: p.user_id }} currentUserId={user?.id} onLikeChange={loadPosts} />)}
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