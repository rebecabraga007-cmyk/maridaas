import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Users,
  BarChart3,
  Shield,
  Bell,
  Megaphone,
  Calendar,
  Search,
  Crown,
  UserCog,
  Trash2,
  Eye,
  TrendingUp,
  Activity,
  Send,
  Loader2,
  Clock,
  ImagePlus,
  Link,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import UserDetailsModal from "@/components/UserDetailsModal";
import MetricDetailModal, { MetricType } from "@/components/MetricDetailModal";
import ImageUpload from "@/components/ImageUpload";

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  postsToday: number;
  postsThisWeek: number;
  totalServices: number;
  servicesThisWeek: number;
  totalVisits: number;
  visitsToday: number;
}

interface UserWithRole {
  user_id: string;
  full_name: string;
  neighborhood: string;
  role: string | null;
  created_at: string;
  primary_neighborhood_id: string | null;
  secondary_neighborhood_id: string | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_global: boolean;
  neighborhood_id: string | null;
  target_user_id: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  image_url: string | null;
  link_url: string | null;
}

interface Neighborhood {
  id: string;
  name: string;
  city: string;
}

interface PostWithDetails {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  neighborhood_id: string;
  author_name: string;
  neighborhood_name: string;
}

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  target_type: string;
  target_id: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [postSearchTerm, setPostSearchTerm] = useState("");

  // User details modal
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<string | null>(null);
  
  // Metric detail modal
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);

  // Announcement form
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState<"global" | "neighborhood" | "user">("global");
  const [announcementTargetId, setAnnouncementTargetId] = useState("");
  const [announcementStartsAt, setAnnouncementStartsAt] = useState("");
  const [announcementEndsAt, setAnnouncementEndsAt] = useState("");
  const [announcementImageUrl, setAnnouncementImageUrl] = useState("");
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState("");

  // Push notification form
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushTarget, setPushTarget] = useState<"all" | "neighborhood" | "user">("all");
  const [pushTargetId, setPushTargetId] = useState("");
  const [pushScheduledAt, setPushScheduledAt] = useState("");
  const [creatingPush, setCreatingPush] = useState(false);

  // Admin post form
  const [adminPostContent, setAdminPostContent] = useState("");
  const [adminPostNeighborhood, setAdminPostNeighborhood] = useState("");
  const [postingAdmin, setPostingAdmin] = useState(false);

  // Moderator neighborhood selection
  const [moderatorNeighborhood, setModeratorNeighborhood] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/feed");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    loadAllData();
  };

  const loadAllData = async () => {
    await Promise.all([
      loadMetrics(),
      loadUsers(),
      loadAnnouncements(),
      loadNeighborhoods(),
      loadPosts(),
      loadScheduledNotifications(),
    ]);
  };

  const loadMetrics = async () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Use admin function to get accurate counts
    const { data: allProfiles } = await supabase.rpc("admin_get_all_profiles");
    const totalUsers = allProfiles?.length || 0;

    const [
      postsRes,
      postsTodayRes,
      postsWeekRes,
      servicesRes,
      servicesWeekRes,
      sessionsRes,
      sessionsTodayRes,
    ] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("services").select("id", { count: "exact", head: true }),
      supabase.from("services").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("user_sessions").select("id", { count: "exact", head: true }),
      supabase.from("user_sessions").select("id", { count: "exact", head: true }).eq("session_date", today),
    ]);

    // Calculate active users (users with 3+ sessions in last week)
    const { data: activeSessions } = await supabase
      .from("user_sessions")
      .select("user_id")
      .gte("session_date", weekAgo.split("T")[0]);

    const userSessionCounts: Record<string, number> = {};
    activeSessions?.forEach((s) => {
      userSessionCounts[s.user_id] = (userSessionCounts[s.user_id] || 0) + 1;
    });
    const activeUsers = Object.values(userSessionCounts).filter((count) => count >= 3).length;

    setMetrics({
      totalUsers,
      activeUsers,
      totalPosts: postsRes.count || 0,
      postsToday: postsTodayRes.count || 0,
      postsThisWeek: postsWeekRes.count || 0,
      totalServices: servicesRes.count || 0,
      servicesThisWeek: servicesWeekRes.count || 0,
      totalVisits: sessionsRes.count || 0,
      visitsToday: sessionsTodayRes.count || 0,
    });
  };

  const loadUsers = async () => {
    // Use admin function to get all profiles
    const { data: profiles, error } = await supabase.rpc("admin_get_all_profiles");

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de usuárias.",
        variant: "destructive",
      });
      return;
    }

    if (profiles) {
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile: any) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role, moderator_neighborhood_id")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          if (roleData?.moderator_neighborhood_id) {
            setModeratorNeighborhood(prev => ({
              ...prev,
              [profile.user_id]: roleData.moderator_neighborhood_id
            }));
          }

          return {
            user_id: profile.user_id,
            full_name: profile.full_name,
            neighborhood: profile.neighborhood,
            role: roleData?.role || "user",
            created_at: profile.created_at,
            primary_neighborhood_id: profile.primary_neighborhood_id,
            secondary_neighborhood_id: profile.secondary_neighborhood_id,
          };
        })
      );
      setUsers(usersWithRoles);
    }
  };

  const loadPosts = async () => {
    const { data: postsData } = await supabase.rpc("admin_get_all_posts");
    
    if (postsData) {
      const postsWithDetails = await Promise.all(
        postsData.map(async (post: any) => {
          const [profileRes, neighborhoodRes] = await Promise.all([
            supabase.rpc("get_public_profile", { target_user_id: post.user_id }),
            supabase.from("neighborhoods").select("name, city").eq("id", post.neighborhood_id).single(),
          ]);
          return {
            ...post,
            author_name: profileRes.data?.[0]?.full_name || "Usuário",
            neighborhood_name: neighborhoodRes.data ? `${neighborhoodRes.data.name} - ${neighborhoodRes.data.city}` : "Bairro",
          };
        })
      );
      setPosts(postsWithDetails);
    }
  };

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setAnnouncements(data);
  };

  const loadNeighborhoods = async () => {
    const { data } = await supabase.from("neighborhoods").select("id, name, city");
    if (data) setNeighborhoods(data);
  };

  const loadScheduledNotifications = async () => {
    const { data } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (data) setScheduledNotifications(data);
  };

  // The datetime-local input returns local browser time
  // We need to treat the input as Brasilia time (UTC-3) and store as-is
  // Since the server should also interpret as Brasilia time
  const convertBrasiliaToUTC = (localDatetime: string) => {
    if (!localDatetime) return new Date().toISOString();
    // The input value is already in local time format (YYYY-MM-DDTHH:mm)
    // We need to interpret this as Brasilia time and convert to UTC
    // Brasilia is UTC-3, so we add 3 hours to get UTC
    const [datePart, timePart] = localDatetime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create date as if it's Brasilia time, then add 3 hours for UTC
    const brasiliaDate = new Date(Date.UTC(year, month - 1, day, hours + 3, minutes));
    return brasiliaDate.toISOString();
  };

  const handleCreatePushNotification = async () => {
    if (!pushTitle.trim() || !pushBody.trim() || !user) {
      toast({ title: "Erro", description: "Preencha título e conteúdo.", variant: "destructive" });
      return;
    }

    setCreatingPush(true);

    const scheduledTime = pushScheduledAt ? convertBrasiliaToUTC(pushScheduledAt) : new Date().toISOString();
    const sendNow = !pushScheduledAt; // Se não tem horário agendado, envia agora

    const { data: insertedNotification, error } = await supabase.from("scheduled_notifications").insert({
      title: pushTitle.trim(),
      body: pushBody.trim(),
      target_type: pushTarget,
      target_id: pushTarget !== "all" ? pushTargetId : null,
      scheduled_at: scheduledTime,
      created_by: user.id,
    }).select().single();

    if (error) {
      toast({ title: "Erro ao criar notificação", description: error.message, variant: "destructive" });
      setCreatingPush(false);
      return;
    }

    // Se for para enviar agora, chama a edge function
    if (sendNow && insertedNotification) {
      try {
        const { data, error: funcError } = await supabase.functions.invoke("send-onesignal-push", {
          body: {
            title: insertedNotification.title,
            message: insertedNotification.body,
            target_type: insertedNotification.target_type,
            target_id: insertedNotification.target_id,
          },
        });

        if (funcError) {
          toast({
            title: "Notificação criada, mas erro ao enviar",
            description: funcError.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Notificação enviada!",
            description: `Enviada para ${data?.results?.[0]?.sent || 0} dispositivos.`,
          });
        }
      } catch {
        toast({ title: "Erro ao enviar notificação", variant: "destructive" });
      }
    } else {
      toast({ title: "Notificação agendada!" });
    }

    setPushTitle("");
    setPushBody("");
    setPushTarget("all");
    setPushTargetId("");
    setPushScheduledAt("");
    loadScheduledNotifications();
    setCreatingPush(false);
  };

  const handleSendNotificationNow = async (notificationId: string) => {
    try {
      toast({ title: "Enviando notificação..." });

      // Fetch notification details first, then send via OneSignal
      const { data: notif } = await supabase
        .from("scheduled_notifications")
        .select("title, body, target_type, target_id")
        .eq("id", notificationId)
        .single();

      if (!notif) {
        toast({ title: "Notificação não encontrada", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-onesignal-push", {
        body: {
          title: notif.title,
          message: notif.body,
          target_type: notif.target_type,
          target_id: notif.target_id,
        },
      });

      if (error) {
        toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Notificação enviada!",
          description: `Enviada para ${data?.results?.[0]?.sent || 0} dispositivos.`,
        });
        loadScheduledNotifications();
      }
    } catch {
      toast({ title: "Erro ao enviar notificação", variant: "destructive" });
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await supabase.from("scheduled_notifications").delete().eq("id", id);
    if (!error) {
      toast({ title: "Notificação excluída" });
      loadScheduledNotifications();
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "moderator" | "user") => {
    if (!user) return;

    // Remove existing role
    await supabase.from("user_roles").delete().eq("user_id", userId);

    if (newRole !== "user") {
      const roleData: any = {
        user_id: userId,
        role: newRole,
        created_by: user.id,
      };

      // If moderator, add the neighborhood_id
      if (newRole === "moderator" && moderatorNeighborhood[userId]) {
        roleData.moderator_neighborhood_id = moderatorNeighborhood[userId];
      }

      const { error } = await supabase.from("user_roles").insert(roleData);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível alterar o cargo.",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Cargo atualizado",
      description: `Usuário agora é ${newRole === "admin" ? "Administrador" : newRole === "moderator" ? "Moderador" : "Usuário comum"}.`,
    });
    loadUsers();
  };

  const handleModeratorNeighborhoodChange = async (userId: string, neighborhoodId: string) => {
    setModeratorNeighborhood(prev => ({ ...prev, [userId]: neighborhoodId }));
    
    // Update if already a moderator
    const userObj = users.find(u => u.user_id === userId);
    if (userObj?.role === "moderator") {
      await supabase
        .from("user_roles")
        .update({ moderator_neighborhood_id: neighborhoodId })
        .eq("user_id", userId)
        .eq("role", "moderator");
      
      toast({ title: "Bairro do moderador atualizado" });
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim() || !user) {
      toast({
        title: "Erro",
        description: "Preencha título e conteúdo.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("announcements").insert({
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      is_global: announcementTarget === "global",
      neighborhood_id: announcementTarget === "neighborhood" ? announcementTargetId : null,
      target_user_id: announcementTarget === "user" ? announcementTargetId : null,
      starts_at: announcementStartsAt || new Date().toISOString(),
      ends_at: announcementEndsAt || null,
      created_by: user.id,
      image_url: announcementImageUrl || null,
      link_url: announcementLinkUrl.trim() || null,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o recado.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Recado criado!", description: "O recado foi publicado." });
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementTarget("global");
    setAnnouncementTargetId("");
    setAnnouncementStartsAt("");
    setAnnouncementEndsAt("");
    setAnnouncementImageUrl("");
    setAnnouncementLinkUrl("");
    loadAnnouncements();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (!error) {
      toast({ title: "Recado excluído" });
      loadAnnouncements();
    }
  };

  const handleAdminPost = async () => {
    if (!adminPostContent.trim() || !adminPostNeighborhood || !user) return;

    setPostingAdmin(true);
    const { error } = await supabase.rpc("admin_create_post", {
      _neighborhood_id: adminPostNeighborhood,
      _content: adminPostContent.trim(),
    });

    if (error) {
      toast({ title: "Erro ao publicar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Publicado!", description: "Postagem criada no bairro selecionado." });
      setAdminPostContent("");
      setAdminPostNeighborhood("");
      loadPosts();
    }
    setPostingAdmin(false);
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.rpc("admin_delete_post", { post_id: postId });
    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Postagem excluída" });
      loadPosts();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(
    (p) =>
      p.content.toLowerCase().includes(postSearchTerm.toLowerCase()) ||
      p.author_name.toLowerCase().includes(postSearchTerm.toLowerCase()) ||
      p.neighborhood_name.toLowerCase().includes(postSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/feed")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-display font-bold text-foreground">Painel Admin</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-muted/50">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="posts" className="text-xs sm:text-sm">
              <Megaphone className="w-4 h-4 mr-1 hidden sm:inline" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs sm:text-sm">
              <Bell className="w-4 h-4 mr-1 hidden sm:inline" />
              Recados
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">
              <Clock className="w-4 h-4 mr-1 hidden sm:inline" />
              Push
            </TabsTrigger>
            <TabsTrigger value="moderation" className="text-xs sm:text-sm">
              <UserCog className="w-4 h-4 mr-1 hidden sm:inline" />
              Moderação
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<Users className="w-6 h-6" />}
                label="Total de Usuários"
                value={metrics?.totalUsers || 0}
                color="primary"
                onClick={() => setSelectedMetric("totalUsers")}
              />
              <MetricCard
                icon={<Activity className="w-6 h-6" />}
                label="Usuários Ativos"
                value={metrics?.activeUsers || 0}
                color="accent"
                subtitle="3+ logins/semana"
                onClick={() => setSelectedMetric("activeUsers")}
              />
              <MetricCard
                icon={<Eye className="w-6 h-6" />}
                label="Visitas Hoje"
                value={metrics?.visitsToday || 0}
                color="secondary"
                onClick={() => setSelectedMetric("visitsToday")}
              />
              <MetricCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Total Visitas"
                value={metrics?.totalVisits || 0}
                color="muted"
                onClick={() => setSelectedMetric("totalVisits")}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <MetricCard
                icon={<Megaphone className="w-6 h-6" />}
                label="Posts Hoje"
                value={metrics?.postsToday || 0}
                color="accent"
                onClick={() => setSelectedMetric("postsToday")}
              />
              <MetricCard
                icon={<BarChart3 className="w-6 h-6" />}
                label="Posts na Semana"
                value={metrics?.postsThisWeek || 0}
                color="primary"
                onClick={() => setSelectedMetric("postsThisWeek")}
              />
              <MetricCard
                icon={<Shield className="w-6 h-6" />}
                label="Total Serviços"
                value={metrics?.totalServices || 0}
                color="secondary"
                onClick={() => setSelectedMetric("totalServices")}
              />
              <MetricCard
                icon={<Calendar className="w-6 h-6" />}
                label="Serviços na Semana"
                value={metrics?.servicesThisWeek || 0}
                color="muted"
                onClick={() => setSelectedMetric("servicesThisWeek")}
              />
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário por nome ou bairro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {filteredUsers.length} usuário(s) encontrado(s)
            </p>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => setSelectedUserForDetails(u.user_id)}
                  className="card-maridaas p-4 w-full text-left hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{u.full_name}</p>
                        {u.role === "admin" && <Crown className="w-4 h-4 text-secondary flex-shrink-0" />}
                        {u.role === "moderator" && <Shield className="w-4 h-4 text-primary flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{u.neighborhood}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          u.role === "admin"
                            ? "bg-secondary/20 text-secondary-foreground"
                            : u.role === "moderator"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.role === "admin" ? "Admin" : u.role === "moderator" ? "Moderador" : "Usuário"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
              )}
            </div>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            {/* Admin Post Form */}
            <div className="card-maridaas p-4 mb-6">
              <h3 className="font-display font-bold text-foreground mb-4">Postar em qualquer bairro</h3>
              <div className="space-y-4">
                <div>
                  <Label>Bairro</Label>
                  <Select value={adminPostNeighborhood} onValueChange={setAdminPostNeighborhood}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um bairro" />
                    </SelectTrigger>
                    <SelectContent>
                      {neighborhoods.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name} - {n.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="O que você quer publicar?"
                  value={adminPostContent}
                  onChange={(e) => setAdminPostContent(e.target.value)}
                  className="min-h-[80px]"
                  maxLength={240}
                />
                <Button 
                  onClick={handleAdminPost} 
                  className="btn-maridaas w-full"
                  disabled={!adminPostContent.trim() || !adminPostNeighborhood || postingAdmin}
                >
                  {postingAdmin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Publicar
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar postagens..."
                  value={postSearchTerm}
                  onChange={(e) => setPostSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <h3 className="font-display font-bold text-foreground mb-4">Últimas postagens</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredPosts.map((p) => (
                <div key={p.id} className="card-maridaas p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground text-sm">{p.author_name}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{p.neighborhood_name}</span>
                      </div>
                      <p className="text-foreground text-sm whitespace-pre-wrap">{p.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePost(p.id)}
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma postagem encontrada</p>
              )}
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <div className="card-maridaas p-4 mb-6">
              <h3 className="font-display font-bold text-foreground mb-4">Criar novo recado</h3>

              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Título do recado"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    placeholder="Conteúdo do recado..."
                    className="min-h-[100px]"
                    maxLength={500}
                  />
                </div>

                <div>
                  <Label>Destinatário</Label>
                  <Select
                    value={announcementTarget}
                    onValueChange={(v) => setAnnouncementTarget(v as "global" | "neighborhood" | "user")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Todos os usuários</SelectItem>
                      <SelectItem value="neighborhood">Bairro específico</SelectItem>
                      <SelectItem value="user">Usuário específico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {announcementTarget === "neighborhood" && (
                  <div>
                    <Label>Bairro</Label>
                    <Select value={announcementTargetId} onValueChange={setAnnouncementTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um bairro" />
                      </SelectTrigger>
                      <SelectContent>
                        {neighborhoods.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name} - {n.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {announcementTarget === "user" && (
                  <div>
                    <Label>Usuário</Label>
                    <Select value={announcementTargetId} onValueChange={setAnnouncementTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Início</Label>
                    <Input
                      type="datetime-local"
                      value={announcementStartsAt}
                      onChange={(e) => setAnnouncementStartsAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Fim (opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={announcementEndsAt}
                      onChange={(e) => setAnnouncementEndsAt(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Link (opcional)
                  </Label>
                  <Input
                    value={announcementLinkUrl}
                    onChange={(e) => setAnnouncementLinkUrl(e.target.value)}
                    placeholder="https://exemplo.com"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">O usuário poderá clicar para abrir este link</p>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4" />
                    Imagem (opcional)
                  </Label>
                  {user && (
                    <ImageUpload
                      userId={user.id}
                      folder="announcements"
                      onImageUploaded={setAnnouncementImageUrl}
                      existingUrl={announcementImageUrl}
                    />
                  )}
                </div>

                <Button onClick={handleCreateAnnouncement} className="btn-maridaas w-full">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Publicar Recado
                </Button>
              </div>
            </div>

            <h3 className="font-display font-bold text-foreground mb-4">Recados ativos</h3>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="card-maridaas p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>
                      
                      {a.image_url && (
                        <div className="mt-2 rounded-lg overflow-hidden max-w-xs">
                          <img 
                            src={a.image_url} 
                            alt={a.title}
                            className="w-full h-24 object-cover"
                          />
                        </div>
                      )}
                      
                      {a.link_url && (
                        <a 
                          href={a.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {a.link_url.length > 40 ? a.link_url.substring(0, 40) + "..." : a.link_url}
                        </a>
                      )}
                      
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {a.is_global ? "Global" : a.neighborhood_id ? "Bairro" : "Usuário"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Início: {format(new Date(a.starts_at), "dd/MM HH:mm")}
                        </span>
                        {a.ends_at && (
                          <span className="text-xs text-muted-foreground">
                            Fim: {format(new Date(a.ends_at), "dd/MM HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum recado publicado</p>
              )}
            </div>
          </TabsContent>

          {/* Push Notifications Tab */}
          <TabsContent value="notifications">
            <div className="card-maridaas p-4 mb-6">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Agendar Notificação Push
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                As notificações serão enviadas no horário de Brasília (UTC-3).
              </p>

              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="Título da notificação"
                    maxLength={50}
                  />
                </div>

                <div>
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    placeholder="Mensagem da notificação..."
                    className="min-h-[80px]"
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label>Destinatário</Label>
                  <Select
                    value={pushTarget}
                    onValueChange={(v) => setPushTarget(v as "all" | "neighborhood" | "user")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      <SelectItem value="neighborhood">Bairro específico</SelectItem>
                      <SelectItem value="user">Usuário específico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pushTarget === "neighborhood" && (
                  <div>
                    <Label>Bairro</Label>
                    <Select value={pushTargetId} onValueChange={setPushTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um bairro" />
                      </SelectTrigger>
                      <SelectContent>
                        {neighborhoods.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name} - {n.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {pushTarget === "user" && (
                  <div>
                    <Label>Usuário</Label>
                    <Select value={pushTargetId} onValueChange={setPushTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Agendar para (Horário de Brasília)</Label>
                  <Input
                    type="datetime-local"
                    value={pushScheduledAt}
                    onChange={(e) => setPushScheduledAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe vazio para enviar imediatamente
                  </p>
                </div>

                <Button onClick={handleCreatePushNotification} className="btn-maridaas w-full" disabled={creatingPush}>
                  {creatingPush ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                  Agendar Notificação
                </Button>
              </div>
            </div>

            <h3 className="font-display font-bold text-foreground mb-4">Notificações agendadas</h3>
            <div className="space-y-3">
              {scheduledNotifications.map((n) => (
                <div key={n.id} className="card-maridaas p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{n.title}</p>
                        {n.sent_at ? (
                          <span className="text-xs bg-accent/50 text-accent-foreground px-2 py-0.5 rounded-full">Enviada</span>
                        ) : (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Pendente</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                      <div className="flex gap-2 mt-2 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(n.scheduled_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                        <span>
                          {n.target_type === "all" ? "Todos" : n.target_type === "neighborhood" ? "Bairro" : "Usuário"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.sent_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendNotificationNow(n.id)}
                          className="text-primary"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Enviar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteNotification(n.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {scheduledNotifications.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma notificação agendada</p>
              )}
            </div>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation">
            <div className="card-maridaas p-4 mb-4">
              <h3 className="font-display font-bold text-foreground mb-2">Gerenciar cargos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Atribua ou remova poderes de moderador e administrador. Moderadores podem deletar posts apenas no bairro atribuído.
              </p>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredUsers.map((u) => (
                <div key={u.user_id} className="card-maridaas p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{u.full_name}</p>
                        <p className="text-sm text-muted-foreground">{u.neighborhood}</p>
                      </div>
                      <Select
                        value={u.role || "user"}
                        onValueChange={(v) => handleRoleChange(u.user_id, v as "admin" | "moderator" | "user")}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="moderator">Moderador</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Moderator neighborhood selector */}
                    {(u.role === "moderator" || moderatorNeighborhood[u.user_id]) && (
                      <div className="pl-0">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Bairro do Moderador
                        </Label>
                        <Select
                          value={moderatorNeighborhood[u.user_id] || ""}
                          onValueChange={(v) => handleModeratorNeighborhoodChange(u.user_id, v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o bairro" />
                          </SelectTrigger>
                          <SelectContent>
                            {neighborhoods.map((n) => (
                              <SelectItem key={n.id} value={n.id}>
                                {n.name} - {n.city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* User Details Modal */}
      <UserDetailsModal
        userId={selectedUserForDetails || ""}
        isOpen={!!selectedUserForDetails}
        onClose={() => setSelectedUserForDetails(null)}
      />

      {/* Metric Detail Modal */}
      <MetricDetailModal
        type={selectedMetric}
        onClose={() => setSelectedMetric(null)}
      />
    </div>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
  color,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "primary" | "secondary" | "accent" | "muted";
  subtitle?: string;
  onClick?: () => void;
}) => {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/20 text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <button 
      onClick={onClick}
      className="card-maridaas p-4 text-left w-full hover:border-primary transition-colors cursor-pointer"
    >
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </button>
  );
};

export default Admin;
