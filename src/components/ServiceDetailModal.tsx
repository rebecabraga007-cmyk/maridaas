import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  X,
  User,
  Star,
  Phone,
  Instagram,
  Send,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Service {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  whatsapp: string | null;
  instagram: string | null;
  owner_name: string;
  avg_rating: number;
  review_count: number;
}

interface Review {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  user_name: string;
}

interface ServiceDetailModalProps {
  service: Service;
  currentUserId?: string;
  userNeighborhoodId?: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

const ServiceDetailModal = ({
  service,
  currentUserId,
  userNeighborhoodId,
  onClose,
  onUpdate,
}: ServiceDetailModalProps) => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState("");
  const [selectedRating, setSelectedRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated w-full sm:max-w-lg max-h-[90vh] overflow-hidden animate-slide-in-bottom sm:animate-scale-in">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">{service.title}</h2>
                <p className="text-muted-foreground">{service.owner_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-secondary fill-secondary" />
                    <span className="text-sm font-medium">{service.avg_rating || "—"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">({service.review_count} avaliações)</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {service.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-2">Descrição</h3>
              <p className="text-muted-foreground">{service.description}</p>
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

          {/* Reviews */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Avaliações</h3>

            {/* Add review */}
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

            {/* Reviews list */}
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="card-maridaas p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{review.user_name}</p>
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
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-foreground text-sm">{review.content}</p>
                </div>
              ))}

              {reviews.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma avaliação ainda. Seja a primeira!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailModal;
