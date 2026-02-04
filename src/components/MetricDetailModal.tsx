import { useState, useEffect } from "react";
import { X, User, MapPin, Star, Calendar, Eye, Briefcase, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type MetricType = 
  | "totalUsers" 
  | "activeUsers" 
  | "visitsToday" 
  | "totalVisits" 
  | "postsToday" 
  | "postsThisWeek" 
  | "totalServices" 
  | "servicesThisWeek";

interface MetricDetailModalProps {
  type: MetricType | null;
  onClose: () => void;
}

interface ServiceItem {
  id: string;
  title: string;
  description: string | null;
  owner_name: string;
  owner_avatar: string | null;
  neighborhood_name: string;
  avg_rating: number;
  created_at: string;
}

interface PostItem {
  id: string;
  content: string;
  author_name: string;
  neighborhood_name: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface UserItem {
  user_id: string;
  full_name: string;
  neighborhood: string;
  city: string;
  created_at: string;
  session_count?: number;
}

interface VisitItem {
  user_id: string;
  full_name: string;
  session_date: string;
  session_count: number;
}

const METRIC_LABELS: Record<MetricType, string> = {
  totalUsers: "Total de Usuários",
  activeUsers: "Usuários Ativos",
  visitsToday: "Visitas Hoje",
  totalVisits: "Total de Visitas",
  postsToday: "Posts de Hoje",
  postsThisWeek: "Posts da Semana",
  totalServices: "Total de Serviços",
  servicesThisWeek: "Serviços da Semana",
};

const MetricDetailModal = ({ type, onClose }: MetricDetailModalProps) => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (type) {
      loadData();
    }
  }, [type]);

  const loadData = async () => {
    setLoading(true);
    
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      switch (type) {
        case "totalServices":
        case "servicesThisWeek":
          await loadServices(type === "servicesThisWeek" ? weekAgo : undefined);
          break;
        case "postsToday":
        case "postsThisWeek":
          await loadPosts(type === "postsToday" ? today : weekAgo);
          break;
        case "totalUsers":
        case "activeUsers":
          await loadUsers(type === "activeUsers");
          break;
        case "visitsToday":
        case "totalVisits":
          await loadVisits(type === "visitsToday" ? today : undefined);
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    
    setLoading(false);
  };

  const loadServices = async (sinceDate?: string) => {
    let query = supabase
      .from("services")
      .select("id, title, description, user_id, neighborhood_id, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (sinceDate) {
      query = query.gte("created_at", sinceDate);
    }

    const { data } = await query.limit(100);

    if (data) {
      const servicesWithDetails = await Promise.all(
        data.map(async (service) => {
          const [profileRes, neighborhoodRes, reviewsRes] = await Promise.all([
            supabase.rpc("get_public_profile", { target_user_id: service.user_id }),
            supabase.from("neighborhoods").select("name, city").eq("id", service.neighborhood_id).single(),
            supabase.from("service_reviews").select("rating").eq("service_id", service.id),
          ]);

          const reviews = reviewsRes.data || [];
          const avgRating = reviews.length > 0
            ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
            : 0;

          return {
            id: service.id,
            title: service.title,
            description: service.description,
            owner_name: profileRes.data?.[0]?.full_name || "Prestadora",
            owner_avatar: profileRes.data?.[0]?.avatar_url || null,
            neighborhood_name: neighborhoodRes.data ? `${neighborhoodRes.data.name} - ${neighborhoodRes.data.city}` : "Bairro",
            avg_rating: Math.round(avgRating * 10) / 10,
            created_at: service.created_at,
          };
        })
      );
      setServices(servicesWithDetails);
    }
  };

  const loadPosts = async (sinceDate: string) => {
    const { data: postsData } = await supabase.rpc("admin_get_all_posts");
    
    if (postsData) {
      const filteredPosts = postsData.filter((p: any) => p.created_at >= sinceDate);
      
      const postsWithDetails = await Promise.all(
        filteredPosts.map(async (post: any) => {
          const [profileRes, neighborhoodRes, likesRes, commentsRes] = await Promise.all([
            supabase.rpc("get_public_profile", { target_user_id: post.user_id }),
            supabase.from("neighborhoods").select("name, city").eq("id", post.neighborhood_id).single(),
            supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", post.id),
            supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", post.id),
          ]);
          
          return {
            id: post.id,
            content: post.content,
            author_name: profileRes.data?.[0]?.full_name || "Usuário",
            neighborhood_name: neighborhoodRes.data ? `${neighborhoodRes.data.name} - ${neighborhoodRes.data.city}` : "Bairro",
            created_at: post.created_at,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
          };
        })
      );
      setPosts(postsWithDetails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
  };

  const loadUsers = async (activeOnly: boolean) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    const { data: profiles } = await supabase.rpc("admin_get_all_profiles");
    
    if (!profiles) return;

    if (activeOnly) {
      // Get sessions from last week for each user
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("user_id")
        .gte("session_date", weekAgo);

      const sessionCounts: Record<string, number> = {};
      sessions?.forEach((s) => {
        sessionCounts[s.user_id] = (sessionCounts[s.user_id] || 0) + 1;
      });

      const activeUsers = profiles
        .filter((p: any) => sessionCounts[p.user_id] >= 3)
        .map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          neighborhood: p.neighborhood,
          city: p.city,
          created_at: p.created_at,
          session_count: sessionCounts[p.user_id],
        }));
      
      setUsers(activeUsers);
    } else {
      setUsers(
        profiles.map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          neighborhood: p.neighborhood,
          city: p.city,
          created_at: p.created_at,
        }))
      );
    }
  };

  const loadVisits = async (date?: string) => {
    let query = supabase
      .from("user_sessions")
      .select("user_id, session_date")
      .order("session_date", { ascending: false });

    if (date) {
      query = query.eq("session_date", date);
    }

    const { data: sessions } = await query.limit(500);

    if (!sessions) return;

    // Group sessions by user
    const userSessions: Record<string, { count: number; lastDate: string }> = {};
    sessions.forEach((s) => {
      if (!userSessions[s.user_id]) {
        userSessions[s.user_id] = { count: 0, lastDate: s.session_date };
      }
      userSessions[s.user_id].count++;
    });

    // Get user profiles
    const { data: profiles } = await supabase.rpc("admin_get_all_profiles");
    const profileMap: Record<string, string> = {};
    profiles?.forEach((p: any) => {
      profileMap[p.user_id] = p.full_name;
    });

    const visitsData: VisitItem[] = Object.entries(userSessions).map(([userId, data]) => ({
      user_id: userId,
      full_name: profileMap[userId] || "Usuário",
      session_date: data.lastDate,
      session_count: data.count,
    }));

    setVisits(visitsData.sort((a, b) => b.session_count - a.session_count));
  };

  const filterItems = <T extends { [key: string]: any }>(items: T[], fields: string[]): T[] => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) =>
      fields.some((field) => {
        const value = item[field];
        return value && typeof value === "string" && value.toLowerCase().includes(term);
      })
    );
  };

  if (!type) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <img src="/logo.png" alt="Loading" className="h-10 w-10 animate-float" />
        </div>
      );
    }

    // Services list
    if (type === "totalServices" || type === "servicesThisWeek") {
      const filtered = filterItems(services, ["title", "owner_name", "neighborhood_name"]);
      return (
        <div className="space-y-3">
          {filtered.map((service) => (
            <div key={service.id} className="card-maridaas p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {service.owner_avatar ? (
                    <img src={service.owner_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{service.title}</h4>
                  <p className="text-sm text-muted-foreground">{service.owner_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {service.neighborhood_name}
                    </span>
                    {service.avg_rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-secondary fill-secondary" />
                        {service.avg_rating}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(service.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{service.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum serviço encontrado</p>
          )}
        </div>
      );
    }

    // Posts list
    if (type === "postsToday" || type === "postsThisWeek") {
      const filtered = filterItems(posts, ["content", "author_name", "neighborhood_name"]);
      return (
        <div className="space-y-3">
          {filtered.map((post) => (
            <div key={post.id} className="card-maridaas p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-foreground text-sm">{post.author_name}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{post.neighborhood_name}</span>
              </div>
              <p className="text-foreground text-sm whitespace-pre-wrap line-clamp-3">{post.content}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(post.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
                <span>❤️ {post.likes_count}</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {post.comments_count}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum post encontrado</p>
          )}
        </div>
      );
    }

    // Users list
    if (type === "totalUsers" || type === "activeUsers") {
      const filtered = filterItems(users, ["full_name", "neighborhood", "city"]);
      return (
        <div className="space-y-3">
          {filtered.map((user) => (
            <div key={user.user_id} className="card-maridaas p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{user.full_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {user.neighborhood}, {user.city}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-muted-foreground">
                    {type === "activeUsers" && user.session_count && (
                      <p className="font-semibold text-primary">{user.session_count} sessões</p>
                    )}
                    <p>{format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setUserToDelete(user)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
          )}
        </div>
      );
    }

    // Visits list
    if (type === "visitsToday" || type === "totalVisits") {
      const filtered = filterItems(visits, ["full_name"]);
      return (
        <div className="space-y-3">
          {filtered.map((visit, index) => (
            <div key={`${visit.user_id}-${index}`} className="card-maridaas p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Eye className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{visit.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Última visita: {format(new Date(visit.session_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary">{visit.session_count}</p>
                  <p className="text-xs text-muted-foreground">visitas</p>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma visita encontrada</p>
          )}
        </div>
      );
    }

    return null;
  };

  const getItemCount = () => {
    switch (type) {
      case "totalServices":
      case "servicesThisWeek":
        return services.length;
      case "postsToday":
      case "postsThisWeek":
        return posts.length;
      case "totalUsers":
      case "activeUsers":
        return users.length;
      case "visitsToday":
      case "totalVisits":
        return visits.length;
      default:
        return 0;
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc("admin_delete_user", {
        target_user_id: userToDelete.user_id,
      });

      if (error) throw error;

      if (data) {
        toast.success("Usuário deletado com sucesso");
        setUsers((prev) => prev.filter((u) => u.user_id !== userToDelete.user_id));
      } else {
        toast.error("Não foi possível deletar o usuário");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao deletar usuário");
    } finally {
      setDeleting(false);
      setUserToDelete(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-elevated overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">
                {METRIC_LABELS[type]}
              </h2>
              {!loading && (
                <p className="text-sm text-muted-foreground">{getItemCount()} item(s)</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Search */}
          <div className="flex-shrink-0 p-4 border-b border-border">
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a conta de <strong>{userToDelete?.full_name}</strong>?
              Esta ação não pode ser desfeita e todos os dados do usuário serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MetricDetailModal;
