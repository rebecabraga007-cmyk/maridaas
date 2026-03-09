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
  User as UserIcon,
  MapPin,
  Instagram,
  Phone,
  Edit2,
  Save,
  X,
  Loader2,
  Calendar,
  Users,
  UserMinus,
  MessageCircle,
  Mail,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";

interface Profile {
  id: string;
  full_name: string;
  bio: string | null;
  neighborhood: string;
  city: string;
  instagram: string | null;
  whatsapp: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  primary_neighborhood_id: string | null;
  secondary_neighborhood_id: string | null;
}

interface Friend {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  neighborhood: string;
}

interface Neighborhood {
  id: string;
  name: string;
  city: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showFriends, setShowFriends] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Editable fields
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
      loadProfile();
      loadNeighborhoods();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, bio, neighborhood, city, instagram, whatsapp, birth_date, avatar_url, primary_neighborhood_id, secondary_neighborhood_id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setBio(data.bio || "");
      setInstagram(data.instagram || "");
      setWhatsapp(data.whatsapp || "");
      setAvatarUrl(data.avatar_url);
    }
  };

  const loadNeighborhoods = async () => {
    const { data } = await supabase
      .from("neighborhoods")
      .select("id, name, city")
      .order("name");
    if (data) setNeighborhoods(data);
  };

  const loadFriends = async () => {
    if (!user) return;
    setLoadingFriends(true);

    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (friendships) {
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const friendsData = await Promise.all(
        friendIds.map(async (friendId) => {
          const { data } = await supabase.rpc("get_public_profile", { target_user_id: friendId });
          if (data && data.length > 0) {
            return {
              id: friendId,
              user_id: friendId,
              full_name: data[0].full_name,
              avatar_url: data[0].avatar_url,
              neighborhood: data[0].neighborhood,
            };
          }
          return null;
        })
      );

      setFriends(friendsData.filter(Boolean) as Friend[]);
    }
    setLoadingFriends(false);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    await supabase
      .from("friendships")
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`);

    toast({ title: "Amigo removido" });
    loadFriends();
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bio.trim() || null,
        instagram: instagram.trim() || null,
        whatsapp: whatsapp.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas." });
      setEditing(false);
      loadProfile();
    }

    setSaving(false);
  };

  const handleCancel = () => {
    setBio(profile?.bio || "");
    setInstagram(profile?.instagram || "");
    setWhatsapp(profile?.whatsapp || "");
    setAvatarUrl(profile?.avatar_url || null);
    setEditing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não informada";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const getNeighborhoodName = (id: string | null) => {
    if (!id) return null;
    const n = neighborhoods.find(n => n.id === id);
    return n ? `${n.name} - ${n.city}` : null;
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
          <h1 className="text-lg font-display font-bold text-foreground">Meu Perfil</h1>
          <div className="flex-1" />
          {!editing ? (
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Edit2 className="w-5 h-5" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="w-5 h-5" />
              </Button>
              <Button size="icon" className="btn-maridaas" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Profile Header */}
        <div className="card-maridaas p-6 text-center mb-6">
          {editing ? (
            <div className="mb-4">
              <ImageUpload
                userId={user?.id || ""}
                folder="avatars"
                existingUrl={avatarUrl}
                onImageUploaded={setAvatarUrl}
                className="w-24 h-24 mx-auto"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          )}
          <h2 className="text-xl font-display font-bold text-foreground mb-1">
            {profile?.full_name || "Usuária"}
          </h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4" />
            {profile?.neighborhood}, {profile?.city}
          </p>

          {/* Action buttons */}
          <div className="flex gap-2 justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowFriends(true);
                loadFriends();
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              Amigos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/inbox")}
            >
              <Mail className="w-4 h-4 mr-2" />
              Recados
            </Button>
          </div>
        </div>

        {/* Bio */}
        <div className="card-maridaas p-4 mb-4">
          <Label className="text-sm font-medium text-muted-foreground mb-2 block">Bio</Label>
          {editing ? (
            <div>
              <Textarea
                placeholder="Conte um pouco sobre você (até 140 caracteres)"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 140))}
                className="min-h-[80px] resize-none"
                maxLength={140}
              />
              <p className="text-xs text-muted-foreground mt-1">{bio.length}/140</p>
            </div>
          ) : (
            <p className="text-foreground whitespace-pre-wrap">{profile?.bio || "Nenhuma bio adicionada."}</p>
          )}
        </div>

        {/* Neighborhoods Info */}
        <div className="card-maridaas p-4 mb-4">
          <Label className="text-sm font-medium text-muted-foreground mb-2 block">Meus Bairros</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-foreground">{profile?.neighborhood}, {profile?.city}</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Principal</span>
            </div>
            {profile?.secondary_neighborhood_id && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent-foreground" />
                <span className="text-foreground">{getNeighborhoodName(profile.secondary_neighborhood_id)}</span>
                <span className="text-xs bg-accent/10 text-accent-foreground px-2 py-0.5 rounded-full">Segundo</span>
              </div>
            )}
          </div>
          <Button
            variant="link"
            size="sm"
            className="px-0 mt-2 text-primary"
            onClick={() => navigate("/neighborhoods")}
          >
            Gerenciar bairros
          </Button>
        </div>

        {/* Contact Info */}
        <div className="card-maridaas p-4 mb-4 space-y-4">
          <h3 className="font-display font-bold text-foreground">Contato</h3>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" /> WhatsApp
            </Label>
            {editing ? (
              <Input
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            ) : (
              <p className="text-foreground">{profile?.whatsapp || "Não informado"}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Instagram className="w-4 h-4" /> Instagram
            </Label>
            {editing ? (
              <Input
                placeholder="@seuusuario"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
              />
            ) : (
              <p className="text-foreground">{profile?.instagram || "Não informado"}</p>
            )}
          </div>
        </div>

        {/* Personal Info (read-only) */}
        <div className="card-maridaas p-4 space-y-4">
          <h3 className="font-display font-bold text-foreground">Informações pessoais</h3>
          
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="w-5 h-5" />
            <span className="text-sm">Data de nascimento: {formatDate(profile?.birth_date || null)}</span>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Essas informações não podem ser editadas por segurança. 
            Entre em contato com o suporte se precisar alterar.
          </p>
        </div>
      </main>

      {/* Friends Dialog */}
      <Dialog open={showFriends} onOpenChange={setShowFriends}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Meus amigos
            </DialogTitle>
          </DialogHeader>
          
          {loadingFriends ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : friends.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{friend.full_name}</p>
                      <p className="text-xs text-muted-foreground">{friend.neighborhood}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/messages/${friend.user_id}`)}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/profile/${friend.user_id}`)}
                    >
                      Ver
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveFriend(friend.user_id)}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Você ainda não tem amigos adicionados.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};
);

export default Profile;
