import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import OnboardingModal from "@/components/OnboardingModal";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NotificationPrompt from "@/components/NotificationPrompt";
import UserSearchModal from "@/components/UserSearchModal";
import NotificationSettingsModal from "@/components/NotificationSettingsModal";
import BottomNav from "@/components/BottomNav";
import SEOHead from "@/components/SEOHead";
import FeedHeader from "@/components/feed/FeedHeader";
import FeedPostComposer from "@/components/feed/FeedPostComposer";
import FeedPostList from "@/components/feed/FeedPostList";
import FeedServiceCarousel from "@/components/feed/FeedServiceCarousel";

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

const PAGE_SIZE = 20;

const Feed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [posting, setPosting] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({ messages: 0, requests: 0 });
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<"primary" | "secondary">("primary");
  const [neighborhoodInfo, setNeighborhoodInfo] = useState<{ primary: NeighborhoodInfo | null; secondary: NeighborhoodInfo | null }>({ primary: null, secondary: null });

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
        if (!localStorage.getItem("maridaas_onboarding_seen")) setShowOnboarding(true);
        if ("Notification" in window && Notification.permission === "default") {
          setTimeout(() => {
            if (!localStorage.getItem("maridaas_notification_dismissed")) setShowNotificationPrompt(true);
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
    const { data } = await supabase.from("user_roles").select("role, moderator_neighborhood_id").eq("user_id", user.id);
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
      setPosts([]);
      setCursor(null);
      setHasMore(true);
      loadPosts(null);
      loadServices();
      loadAnnouncements();
      subscribeToRealtimePosts();
    }
  }, [currentNeighborhoodId]);

  // Realtime subscription for new posts
  const subscribeToRealtimePosts = () => {
    if (!currentNeighborhoodId) return;

    const channel = supabase
      .channel(`posts-${currentNeighborhoodId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `neighborhood_id=eq.${currentNeighborhoodId}`,
        },
        async (payload) => {
          const newPost = payload.new as any;
          
          // Get profile info for the new post
          const { data: profileData } = await supabase.rpc("get_public_profile", { 
            target_user_id: newPost.user_id 
          });
          
          const enrichedPost = {
            ...newPost,
            author: profileData?.[0]?.full_name || "Usuária",
            avatar_url: profileData?.[0]?.avatar_url || null,
            likes_count: 0,
            comments_count: 0,
          };
          
          setPosts((prev) => [enrichedPost, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const loadAnnouncements = async () => {
    if (!user || !currentNeighborhoodId) return;
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .lte("starts_at", new Date().toISOString())
      .order("is_global", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      setAnnouncements(data.filter((a) => {
        if (a.ends_at && new Date(a.ends_at) <= new Date()) return false;
        if (a.is_global) return true;
        if (a.neighborhood_id === currentNeighborhoodId) return true;
        if (a.target_user_id === user.id) return true;
        return false;
      }));
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
      const ids = [data.primary_neighborhood_id, data.secondary_neighborhood_id].filter(Boolean);
      if (ids.length > 0) {
        const { data: neighborhoods } = await supabase.from("neighborhoods").select("id, name, city").in("id", ids);
        if (neighborhoods) {
          setNeighborhoodInfo({
            primary: neighborhoods.find((n) => n.id === data.primary_neighborhood_id) || null,
            secondary: neighborhoods.find((n) => n.id === data.secondary_neighborhood_id) || null,
          });
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
      supabase.from("user_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).is("read_at", null),
      supabase.from("friendships").select("id", { count: "exact", head: true }).eq("addressee_id", user.id).eq("status", "pending"),
    ]);
    setUnreadCounts({ messages: messagesRes.count || 0, requests: requestsRes.count || 0 });
  };

  const loadPosts = useCallback(async (afterCursor: string | null = null) => {
    if (!currentNeighborhoodId || loadingMore) return;
    setLoadingMore(true);

    let query = supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url")
      .eq("neighborhood_id", currentNeighborhoodId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (afterCursor) query = query.lt("created_at", afterCursor);

    const { data, error } = await query;

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar as postagens.", variant: "destructive" });
      setLoadingMore(false);
      return;
    }

    if (!data || data.length === 0) { setHasMore(false); setLoadingMore(false); return; }
    if (data.length < PAGE_SIZE) setHasMore(false);

    setCursor(data[data.length - 1].created_at);

    const postIds = data.map((p) => p.id);
    const uniqueUserIds = [...new Set(data.map((p) => p.user_id))];

    const [profileResults, likesRes, commentsRes] = await Promise.all([
      Promise.all(uniqueUserIds.map((uid) => supabase.rpc("get_public_profile", { target_user_id: uid }))),
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ]);

    const profilesMap = new Map(
      profileResults.flatMap((r, i) => r.data?.[0] ? [[uniqueUserIds[i], r.data[0]]] : [])
    );

    const likesMap = new Map<string, number>();
    for (const like of likesRes.data || []) likesMap.set(like.post_id, (likesMap.get(like.post_id) || 0) + 1);

    const commentsMap = new Map<string, number>();
    for (const comment of commentsRes.data || []) commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1);

    const newPosts = data.map((post) => {
      const profile = profilesMap.get(post.user_id) as any;
      return {
        ...post,
        author: profile?.full_name || "Usuária",
        avatar_url: profile?.avatar_url || null,
        likes_count: likesMap.get(post.id) || 0,
        comments_count: commentsMap.get(post.id) || 0,
      };
    });

    if (afterCursor) setPosts((prev) => [...prev, ...newPosts]);
    else setPosts(newPosts);

    setLoadingMore(false);
  }, [currentNeighborhoodId, loadingMore, toast]);

  const loadServices = async () => {
    if (!currentNeighborhoodId) return;
    const { data } = await supabase.rpc("get_services_with_details", { _neighborhood_id: currentNeighborhoodId });
    setServices((data || []).slice(0, 10));
  };

  const handlePost = async (content: string, imageUrl: string) => {
    if (!content || !user || !currentNeighborhoodId) return;
    if (content.length > 240) {
      toast({ title: "Texto muito longo", description: "O limite é de 240 caracteres.", variant: "destructive" });
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      neighborhood_id: currentNeighborhoodId,
      content,
      image_url: imageUrl || null,
    });
    if (error) {
      toast({ title: "Erro ao publicar", description: "Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Publicado!", description: "Sua postagem foi compartilhada." });
      reloadPosts();
    }
    setPosting(false);
  };

  const reloadPosts = () => {
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    loadPosts(null);
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
      <SEOHead title="Feed — Maridaas" description="Veja as últimas novidades do seu bairro, publique e interaja com suas vizinhas." noindex />

      {showOnboarding && (
        <OnboardingModal onClose={() => { setShowOnboarding(false); localStorage.setItem("maridaas_onboarding_seen", "true"); }} />
      )}
      {showNotificationSettings && <NotificationSettingsModal onClose={() => setShowNotificationSettings(false)} />}

      <FeedHeader
        userProfile={userProfile}
        neighborhoodInfo={neighborhoodInfo}
        selectedNeighborhood={selectedNeighborhood}
        onToggleNeighborhood={() => setSelectedNeighborhood((p) => p === "primary" ? "secondary" : "primary")}
        unreadCount={unreadCounts.messages + unreadCounts.requests}
        isAdmin={isAdmin}
        onSearchClick={() => setShowUserSearch(true)}
        onInboxClick={() => navigate("/inbox")}
        onAdminClick={() => navigate("/admin")}
        onNotificationClick={() => setShowNotificationSettings(true)}
        onLogout={handleLogout}
      />

      <UserSearchModal isOpen={showUserSearch} onClose={() => setShowUserSearch(false)} />

      <main className="container mx-auto px-4 pt-20">
        {showNotificationPrompt && (
          <NotificationPrompt onClose={() => { setShowNotificationPrompt(false); localStorage.setItem("maridaas_notification_dismissed", "true"); }} />
        )}
        {announcements.map((ann) => <AnnouncementBanner key={ann.id} announcement={ann} />)}

        <FeedServiceCarousel services={services} />

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Mural do bairro</h2>
          <FeedPostComposer userId={user?.id || ""} posting={posting} onPost={handlePost} />
          <FeedPostList
            posts={posts}
            currentUserId={user?.id}
            canModerate={isAdmin || isModerator}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={() => loadPosts(cursor)}
            onReload={reloadPosts}
          />
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Feed;
