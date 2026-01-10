import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Send,
  User as UserIcon,
  Loader2,
  Home,
  Briefcase,
  MapPin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

const Messages = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null);

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
    if (user && userId) {
      loadRecipientProfile();
      loadMessages();
      markAsRead();
    }
  }, [user, userId]);

  const loadRecipientProfile = async () => {
    if (!userId) return;
    const { data } = await supabase.rpc("get_public_profile", { target_user_id: userId });
    if (data && data.length > 0) {
      setRecipientProfile({
        full_name: data[0].full_name,
        avatar_url: data[0].avatar_url,
      });
    }
  };

  const loadMessages = async () => {
    if (!user || !userId) return;

    const { data } = await supabase
      .from("user_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true });

    if (data) {
      // Filter to only messages between current user and recipient
      const filtered = data.filter(
        (m) =>
          (m.sender_id === user.id && m.receiver_id === userId) ||
          (m.sender_id === userId && m.receiver_id === user.id)
      );
      setMessages(filtered);
    }
  };

  const markAsRead = async () => {
    if (!user || !userId) return;
    await supabase
      .from("user_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", userId)
      .eq("receiver_id", user.id)
      .is("read_at", null);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !userId) return;

    setSending(true);
    const { error } = await supabase.from("user_messages").insert({
      sender_id: user.id,
      receiver_id: userId,
      content: newMessage.trim(),
    });

    if (error) {
      toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
    } else {
      setNewMessage("");
      loadMessages();
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              {recipientProfile?.avatar_url ? (
                <img
                  src={recipientProfile.avatar_url}
                  alt={recipientProfile.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-white" />
              )}
            </div>
            <h1 className="text-lg font-display font-bold text-foreground">
              {recipientProfile?.full_name || "Usuária"}
            </h1>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 container mx-auto px-4 pt-20 pb-32 overflow-y-auto">
        <div className="space-y-3">
          {messages.map((message) => {
            const isMine = message.sender_id === user?.id;
            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma mensagem ainda.</p>
              <p className="text-sm">Envie um recado!</p>
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border p-4">
        <div className="container mx-auto flex gap-2">
          <Textarea
            placeholder="Escreva seu recado..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[50px] max-h-[120px] resize-none flex-1"
            maxLength={1000}
          />
          <Button
            onClick={handleSend}
            className="btn-maridaas h-auto"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
