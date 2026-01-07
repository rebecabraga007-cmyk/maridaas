import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
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
  Home,
  Briefcase,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  bio: string | null;
  neighborhood: string;
  city: string;
  instagram: string | null;
  whatsapp: string | null;
  birth_date: string | null;
  primary_neighborhood_id: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Editable fields
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

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
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, bio, neighborhood, city, instagram, whatsapp, birth_date, primary_neighborhood_id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setBio(data.bio || "");
      setInstagram(data.instagram || "");
      setWhatsapp(data.whatsapp || "");
    }
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
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas.",
      });
      setEditing(false);
      loadProfile();
    }

    setSaving(false);
  };

  const handleCancel = () => {
    setBio(profile?.bio || "");
    setInstagram(profile?.instagram || "");
    setWhatsapp(profile?.whatsapp || "");
    setEditing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não informada";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
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
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-1">
            {profile?.full_name || "Usuária"}
          </h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4" />
            {profile?.neighborhood}, {profile?.city}
          </p>
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
            <p className="text-foreground">{profile?.bio || "Nenhuma bio adicionada."}</p>
          )}
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-40">
        <div className="container mx-auto px-4 flex items-center justify-around py-2">
          <NavItem icon={<Home className="w-6 h-6" />} label="Início" onClick={() => navigate("/feed")} />
          <NavItem icon={<Briefcase className="w-6 h-6" />} label="Serviços" onClick={() => navigate("/services")} />
          <NavItem icon={<MapPin className="w-6 h-6" />} label="Bairros" onClick={() => navigate("/neighborhoods")} />
          <NavItem icon={<UserIcon className="w-6 h-6" />} label="Perfil" active />
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

export default Profile;
