import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  X,
  User,
  Star,
  Phone,
  Instagram,
  Send,
  Loader2,
  MoreVertical,
  Trash2,
  Edit2,
  Save,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import ProfilePreviewPopup from "./ProfilePreviewPopup";
import UserBadge from "./UserBadge";
import ImageUpload from "./ImageUpload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Service {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  whatsapp: string | null;
  instagram: string | null;
  owner_name: string;
  owner_avatar?: string | null;
  avg_rating: number;
  review_count: number;
  image_url?: string | null;
}

interface Review {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
}

interface ServiceDetailModalProps {
  service: Service;
  currentUserId?: string;
  userNeighborhoodId?: string | null;
  onClose: () => void;
  onUpdate: () => void;
  isAdmin?: boolean;
  isModerator?: boolean;
}

const ServiceDetailModal = ({
  service,
  currentUserId,
  userNeighborhoodId,
  onClose,
  onUpdate,
  isAdmin = false,
  isModerator = false,
}: ServiceDetailModalProps) => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState("");
  const [selectedRating, setSelectedRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [profilePopupUserId, setProfilePopupUserId] = useState<string | null>(null);
  
  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(service.title);
  const [editDescription, setEditDescription] = useState(service.description || "");
  const [editWhatsapp, setEditWhatsapp] = useState(service.whatsapp || "");
  const [editInstagram, setEditInstagram] = useState(service.instagram || "");
  const [editImageUrl, setEditImageUrl] = useState(service.image_url || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUserId === service.user_id;
  const canModerate = isOwner || isAdmin || isModerator;

  useEffect(() => {
    loadReviews();
  }, [service.id]);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("service_reviews")
      .select("id, content, rating, created_at, user_id")
      .eq("service_id", service.id)
      .order("created_at", { ascending: false });

    if (data) {
      const reviewsWithNames = await Promise.all(
        data.map(async (review) => {
          const { data: profileData } = await supabase
            .rpc("get_public_profile", { target_user_id: review.user_id });
          return {
            ...review,
            user_name: profileData?.[0]?.full_name || "Usuária",
            avatar_url: profileData?.[0]?.avatar_url || null,
          };
        })
      );
      setReviews(reviewsWithNames);
    }
  };

  const handleSubmitReview = async () => {
    if (!newReview.trim() || !currentUserId) return;

    setSubmitting(true);

    const { error } = await supabase.from("service_reviews").insert({
      service_id: service.id,
      user_id: currentUserId,
      content: newReview.trim(),
      rating: selectedRating,
    });

    if (error) {
      toast({
        title: "Erro ao enviar avaliação",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Avaliação enviada!",
        description: "Obrigada por compartilhar sua experiência.",
      });
      setNewReview("");
      setSelectedRating(5);
      loadReviews();
      onUpdate();
    }

    setSubmitting(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    const { error } = await supabase.from("service_reviews").delete().eq("id", reviewId);
    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Avaliação deletada" });
      loadReviews();
      onUpdate();
    }
  };

  const handleSaveService = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from("services")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        whatsapp: editWhatsapp.trim() || null,
        instagram: editInstagram.trim() || null,
        image_url: editImageUrl || null,
      })
      .eq("id", service.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço atualizado!" });
      setEditing(false);
      onUpdate();
    }
    setSaving(false);
  };

  const handleDeleteService = async () => {
    setDeleting(true);

    const { error } = await supabase.from("services").delete().eq("id", service.id);

    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço deletado" });
      onClose();
      onUpdate();
    }
    setDeleting(false);
  };

  const openWhatsApp = () => {
    if (!service.whatsapp) return;
    const phone = service.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  const openInstagram = () => {
    if (!service.instagram) return;
    const username = service.instagram.replace("@", "");
    window.open(`https://instagram.com/${username}`, "_blank");
  };

  const handleProfileClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfilePopupUserId(userId);
    setShowProfilePopup(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated w-full sm:max-w-lg max-h-[90vh] overflow-hidden animate-slide-in-bottom sm:animate-scale-in">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="flex gap-4">
              <button
                onClick={(e) => handleProfileClick(service.user_id, e)}
                className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-primary transition-all cursor-pointer overflow-hidden"
              >
                {service.image_url || service.owner_avatar ? (
                  <img
                    src={service.image_url || service.owner_avatar || ""}
                    alt={service.owner_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
              <div>
                {editing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="font-display font-bold text-lg mb-2"
                    maxLength={100}
                  />
                ) : (
                  <h2 className="text-xl font-display font-bold text-foreground">{service.title}</h2>
                )}
                <button
                  onClick={(e) => handleProfileClick(service.user_id, e)}
                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                >
                  {service.owner_name}
                  <UserBadge userId={service.user_id} />
                </button>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-secondary fill-secondary" />
                    <span className="text-sm font-medium">{service.avg_rating || "—"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">({service.review_count} avaliações)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {canModerate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && (
                      <DropdownMenuItem onClick={() => setEditing(true)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleDeleteService}
                      disabled={deleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleting ? "Deletando..." : "Deletar"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Description */}
          {editing ? (
            <div className="mb-6 space-y-4">
              {/* Image upload for editing */}
              <div>
                <Label>Imagem do serviço</Label>
                <ImageUpload
                  userId={service.user_id}
                  folder="services"
                  onImageUploaded={(url) => setEditImageUrl(url || "")}
                  existingUrl={editImageUrl}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-[80px]"
                  maxLength={500}
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input
                  value={editInstagram}
                  onChange={(e) => setEditInstagram(e.target.value)}
                  placeholder="@usuario"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveService} className="btn-maridaas flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar</>}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {service.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-foreground mb-2">Descrição</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{service.description}</p>
                </div>
              )}

              {/* Contact buttons */}
              <div className="flex gap-3 mb-6">
                {service.whatsapp && (
                  <Button onClick={openWhatsApp} variant="outline" className="flex-1">
                    <Phone className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                )}
                {service.instagram && (
                  <Button onClick={openInstagram} variant="outline" className="flex-1">
                    <Instagram className="w-4 h-4 mr-2" /> Instagram
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Reviews */}
          {!editing && (
            <div>
              <h3 className="font-semibold text-foreground mb-4">Avaliações</h3>

              {/* Add review */}
              {currentUserId && (
                <div className="card-maridaas p-4 mb-4">
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setSelectedRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= selectedRating ? "text-secondary fill-secondary" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Compartilhe sua experiência com esse serviço..."
                    value={newReview}
                    onChange={(e) => setNewReview(e.target.value)}
                    className="min-h-[60px] resize-none mb-3"
                    maxLength={500}
                  />
                  <Button
                    onClick={handleSubmitReview}
                    className="btn-maridaas w-full"
                    disabled={!newReview.trim() || submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Enviar avaliação</>}
                  </Button>
                </div>
              )}

              {/* Reviews list */}
              <div className="space-y-3">
                {reviews.map((review) => {
                  const isReviewOwner = currentUserId === review.user_id;
                  const canDeleteReview = isReviewOwner || isAdmin || isModerator;

                  return (
                    <div key={review.id} className="card-maridaas p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={(e) => handleProfileClick(review.user_id, e)}
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                        >
                          {review.avatar_url ? (
                            <img src={review.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleProfileClick(review.user_id, e)}
                              className="font-medium text-foreground text-sm hover:text-primary transition-colors cursor-pointer"
                            >
                              {review.user_name}
                            </button>
                            <UserBadge userId={review.user_id} />
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= (review.rating || 0) ? "text-secondary fill-secondary" : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                          {canDeleteReview && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                                  <MoreVertical className="w-3 h-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteReview(review.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      <p className="text-foreground text-sm whitespace-pre-wrap">{review.content}</p>
                    </div>
                  );
                })}

                {reviews.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma avaliação ainda. Seja a primeira!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Preview Popup */}
      {showProfilePopup && profilePopupUserId && (
        <ProfilePreviewPopup
          userId={profilePopupUserId}
          isOpen={showProfilePopup}
          onClose={() => setShowProfilePopup(false)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default ServiceDetailModal;
