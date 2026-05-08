import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Home,
  CreditCard,
  Loader2,
} from "lucide-react";

interface UserDetailsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface FullProfile {
  full_name: string;
  cpf: string;
  birth_date: string | null;
  neighborhood: string;
  city: string;
  address: string | null;
  cep: string | null;
  whatsapp: string | null;
  instagram: string | null;
  avatar_url: string | null;
  created_at: string;
}

const UserDetailsModal = ({ userId, isOpen, onClose }: UserDetailsModalProps) => {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      loadFullProfile();
    }
  }, [isOpen, userId]);

  const loadFullProfile = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc("admin_get_full_profile" as any, {
      target_user_id: userId,
    });

    if (data && Array.isArray(data) && data.length > 0) {
      const profile = data[0] as any;
      setProfile({
        full_name: profile.full_name,
        cpf: profile.cpf,
        birth_date: profile.birth_date,
        neighborhood: profile.neighborhood,
        city: profile.city,
        address: profile.address,
        cep: profile.cep,
        whatsapp: profile.whatsapp,
        instagram: profile.instagram,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil deste usuário.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return "Não informado";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não informada";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes do Usuário</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{profile.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Cadastro: {formatDate(profile.created_at)}
                </p>
              </div>
            </div>

            {/* Personal Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Dados Pessoais</h4>
              
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">CPF:</span>
                <span className="font-mono">{formatCPF(profile.cpf)}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Nascimento:</span>
                <span>{formatDate(profile.birth_date)}</span>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Endereço</h4>
              
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Bairro:</span>
                <span>{profile.neighborhood}, {profile.city}</span>
              </div>

              {profile.address && (
                <div className="flex items-start gap-3 text-sm">
                  <Home className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">Endereço:</span>
                  <span>{profile.address}</span>
                </div>
              )}

              {profile.cep && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">CEP:</span>
                  <span className="font-mono">{profile.cep}</span>
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Contato</h4>
              
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">WhatsApp:</span>
                <span>{profile.whatsapp || "Não informado"}</span>
              </div>

              {profile.instagram && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground ml-7">Instagram:</span>
                  <span>{profile.instagram}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Perfil não encontrado
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;
