import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  User,
  MapPin,
  Instagram,
  MessageCircle,
  UserPlus,
  UserMinus,
  Mail,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfilePreviewPopupProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

interface Profile {
  full_name: string;
  bio: string | null;
  neighborhood: string;
  city: string;
  instagram: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
}

const ProfilePreviewPopup = ({ userId, isOpen, onClose, currentUserId }: ProfilePreviewPopupProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadProfile();
      if (currentUserId && currentUserId !== userId) {
        checkFriendship();
      }
    }
  }, [isOpen, userId, currentUserId]);

  const loadProfile = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_public_profile", { target_user_id: userId });
    if (data && data.length > 0) {
      setProfile(data[0]);
    }
    setLoading(false);
  };

  const checkFriendship = async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .limit(1);

    if (data && data.length > 0) {
      const friendship = data.find(
        (f) =>
          (f.requester_id === currentUserId || f.requester_id === userId) &&
          data.some((d) => d.id === f.id)
      );
      if (friendship) {
        setFriendshipStatus(friendship.status);
        setFriendshipId(friendship.id);
      }
    }
  };

  const handleAddFriend = async () => {
    if (!currentUserId) return;
    setActionLoading(true);

    const { error } = await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: userId,
    });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível enviar solicitação.", variant: "destructive" });
    } else {
      toast({ title: "Solicitação enviada!" });
      setFriendshipStatus("pending");
    }
    setActionLoading(false);
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    setActionLoading(true);

    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível remover amizade.", variant: "destructive" });
    } else {
      toast({ title: "Amizade removida" });
      setFriendshipStatus(null);
      setFriendshipId(null);
    }
    setActionLoading(false);
  };

  const handleSendMessage = () => {
    navigate(`/messages/${userId}`);
    onClose();
  };

  const handleViewFullProfile = () => {
    navigate(`/profile/${userId}`);
    onClose();
  };

  const isSelf = currentUserId === userId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="p-6">
            {/* Avatar & Name */}
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-white" />
                )}
              </div>
              <h3 className="text-lg font-display font-bold text-foreground">{profile.full_name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {profile.neighborhood}, {profile.city}
              </p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-foreground text-center mb-4 whitespace-pre-wrap">{profile.bio}</p>
            )}

            {/* Social buttons */}
            <div className="flex gap-2 justify-center mb-4">
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {profile.whatsapp && (
                <a
                  href={`https://wa.me/55${profile.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>

            {/* Action buttons */}
            {!isSelf && currentUserId && (
              <div className="flex gap-2 mb-4">
                {friendshipStatus === "accepted" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleRemoveFriend}
                    disabled={actionLoading}
                  >
                    <UserMinus className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                ) : friendshipStatus === "pending" ? (
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    Solicitação enviada
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleAddFriend}
                    disabled={actionLoading}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleSendMessage}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Recado
                </Button>
              </div>
            )}

            {/* View full profile */}
            <Button
              variant="default"
              className="w-full btn-maridaas"
              onClick={handleViewFullProfile}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver perfil completo
            </Button>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            Perfil não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePreviewPopup;
