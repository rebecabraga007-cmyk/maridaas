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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  email: string;
  neighborhood: string;
  role: string | null;
  created_at: string;
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
}

interface Neighborhood {
  id: string;
  name: string;
  city: string;
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
  const [searchTerm, setSearchTerm] = useState("");

  // Announcement form
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState<"global" | "neighborhood" | "user">("global");
  const [announcementTargetId, setAnnouncementTargetId] = useState("");
  const [announcementStartsAt, setAnnouncementStartsAt] = useState("");
  const [announcementEndsAt, setAnnouncementEndsAt] = useState("");

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
    ]);
  };

  const loadMetrics = async () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      usersRes,
      postsRes,
      postsTodayRes,
      postsWeekRes,
      servicesRes,
      servicesWeekRes,
      sessionsRes,
      sessionsTodayRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
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
      totalUsers: usersRes.count || 0,
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
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, neighborhood, created_at")
      .order("created_at", { ascending: false });

    if (profiles) {
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          return {
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: "", // Email not accessible directly
            neighborhood: profile.neighborhood,
            role: roleData?.role || "user",
            created_at: profile.created_at,
          };
        })
      );
      setUsers(usersWithRoles);
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

  const handleRoleChange = async (userId: string, newRole: "admin" | "moderator" | "user") => {
    if (!user) return;

    // Remove existing role
    await supabase.from("user_roles").delete().eq("user_id", userId);

    if (newRole !== "user") {
      // Add new role
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
        created_by: user.id,
      });

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
    loadAnnouncements();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (!error) {
      toast({ title: "Recado excluído" });
      loadAnnouncements();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
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
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs sm:text-sm">
              <Megaphone className="w-4 h-4 mr-1 hidden sm:inline" />
              Recados
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
              />
              <MetricCard
                icon={<Activity className="w-6 h-6" />}
                label="Usuários Ativos"
                value={metrics?.activeUsers || 0}
                color="accent"
                subtitle="3+ logins/semana"
              />
              <MetricCard
                icon={<Eye className="w-6 h-6" />}
                label="Visitas Hoje"
                value={metrics?.visitsToday || 0}
                color="secondary"
              />
              <MetricCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Total Visitas"
                value={metrics?.totalVisits || 0}
                color="muted"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <MetricCard
                icon={<Megaphone className="w-6 h-6" />}
                label="Posts Hoje"
                value={metrics?.postsToday || 0}
                color="accent"
              />
              <MetricCard
                icon={<BarChart3 className="w-6 h-6" />}
                label="Posts na Semana"
                value={metrics?.postsThisWeek || 0}
                color="primary"
              />
              <MetricCard
                icon={<Shield className="w-6 h-6" />}
                label="Total Serviços"
                value={metrics?.totalServices || 0}
                color="secondary"
              />
              <MetricCard
                icon={<Calendar className="w-6 h-6" />}
                label="Serviços na Semana"
                value={metrics?.servicesThisWeek || 0}
                color="muted"
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

            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div key={u.user_id} className="card-maridaas p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{u.full_name}</p>
                        {u.role === "admin" && <Crown className="w-4 h-4 text-secondary" />}
                        {u.role === "moderator" && <Shield className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{u.neighborhood}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
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
                </div>
              ))}
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
                    <div>
                      <p className="font-semibold text-foreground">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
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
                      className="text-destructive"
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

          {/* Moderation Tab */}
          <TabsContent value="moderation">
            <div className="card-maridaas p-4 mb-4">
              <h3 className="font-display font-bold text-foreground mb-2">Gerenciar cargos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Atribua ou remova poderes de moderador e administrador.
              </p>
            </div>

            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.user_id} className="card-maridaas p-4">
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
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "primary" | "secondary" | "accent" | "muted";
  subtitle?: string;
}) => {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/20 text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <div className="card-maridaas p-4">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
};

export default Admin;
