import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MessageCircle,
  User as UserIcon,
  Loader2,
  Home,
  Briefcase,
  MapPin,
  Users,
  Check,
  X,
  Trash2,
  Bell,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface FriendRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string | null;
  requesterNeighborhood: string;
  createdAt: string;
}

const Inbox = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

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
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadFriendRequests();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    const { data: messages } = await supabase
      .from("user_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (messages) {
      const conversationsMap = new Map<string, any>();

      for (const msg of messages) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: 0,
          });
        }

        if (msg.receiver_id === user.id && !msg.read_at) {
          const conv = conversationsMap.get(otherUserId);
          conv.unreadCount++;
        }
      }

      const conversationsWithProfiles = await Promise.all(
        Array.from(conversationsMap.values()).map(async (conv) => {
          const { data } = await supabase.rpc("get_public_profile", { target_user_id: conv.userId });
          return {
            ...conv,
            fullName: data?.[0]?.full_name || "Usuária",
            avatarUrl: data?.[0]?.avatar_url || null,
          };
        })
      );

      setConversations(conversationsWithProfiles);
    }
  };

  const loadFriendRequests = async () => {
    if (!user) return;

    const { data: requests } = await supabase
      .from("friendships")
      .select("id, requester_id, created_at")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (requests) {
      const requestsWithProfiles = await Promise.all(
        requests.map(async (req) => {
          const { data } = await supabase.rpc("get_public_profile", { target_user_id: req.requester_id });
          return {
            id: req.id,
            requesterId: req.requester_id,
            requesterName: data?.[0]?.full_name || "Usuária",
            requesterAvatar: data?.[0]?.avatar_url || null,
            requesterNeighborhood: data?.[0]?.neighborhood || "",
            createdAt: req.created_at,
          };
        })
      );
      setFriendRequests(requestsWithProfiles);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível aceitar a solicitação.", variant: "destructive" });
    } else {
      toast({ title: "Amizade aceita!", description: "Vocês agora são amigas." });
      loadFriendRequests();
    }
    setProcessingRequest(null);
  };

  const handleDeclineRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível recusar a solicitação.", variant: "destructive" });
    } else {
      toast({ title: "Solicitação recusada" });
      loadFriendRequests();
    }
    setProcessingRequest(null);
  };

  const handleDeleteConversation = async (otherUserId: string) => {
    if (!user) return;

    await supabase
      .from("user_messages")
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`);

    toast({ title: "Conversa excluída" });
    loadConversations();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/feed")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">Caixa de Entrada</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        <Tabs defaultValue="messages" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Recados
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2 relative">
              <Users className="w-4 h-4" />
              Solicitações
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <div className="space-y-3">
              {conversations.map((conv) => (
                <div
                  key={conv.userId}
                  className="card-maridaas p-4 flex items-center gap-3"
                >
                  <button
                    onClick={() => navigate(`/messages/${conv.userId}`)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        {conv.avatarUrl ? (
                          <img src={conv.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-secondary-foreground text-xs rounded-full flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{conv.fullName}</p>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteConversation(conv.userId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {conversations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa ainda</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-3">
              {friendRequests.map((req) => (
                <div key={req.id} className="card-maridaas p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      {req.requesterAvatar ? (
                        <img src={req.requesterAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{req.requesterName}</p>
                      <p className="text-sm text-muted-foreground">{req.requesterNeighborhood}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        className="btn-maridaas"
                        onClick={() => handleAcceptRequest(req.id)}
                        disabled={processingRequest === req.id}
                      >
                        {processingRequest === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDeclineRequest(req.id)}
                        disabled={processingRequest === req.id}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {friendRequests.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma solicitação pendente</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-40">
        <div className="container mx-auto px-4 flex items-center justify-around py-2">
          <NavItem icon={<Home className="w-6 h-6" />} label="Início" onClick={() => navigate("/feed")} />
          <NavItem icon={<Briefcase className="w-6 h-6" />} label="Serviços" onClick={() => navigate("/services")} />
          <NavItem icon={<MapPin className="w-6 h-6" />} label="Bairros" onClick={() => navigate("/neighborhoods")} />
          <NavItem icon={<UserIcon className="w-6 h-6" />} label="Perfil" onClick={() => navigate("/profile")} />
        </div>
      </nav>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
  >
    {icon}<span className="text-xs font-medium">{label}</span>
  </button>
);

export default Inbox;
