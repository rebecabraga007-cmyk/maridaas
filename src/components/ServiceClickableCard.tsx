import { useState, useEffect } from "react";
import { Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ServiceDetailModal from "./ServiceDetailModal";

interface ServiceClickableCardProps {
  serviceId: string;
  title: string;
  ownerName: string;
  avgRating: number;
}

interface FullService {
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

const ServiceClickableCard = ({ serviceId, title, ownerName, avgRating }: ServiceClickableCardProps) => {
  const [showModal, setShowModal] = useState(false);
  const [fullService, setFullService] = useState<FullService | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id);
    });
  }, []);

  const loadFullService = async () => {
    setLoading(true);
    const { data: serviceData } = await supabase
      .from("services")
      .select("id, title, description, user_id, whatsapp, instagram")
      .eq("id", serviceId)
      .single();

    if (serviceData) {
      const [profileRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", serviceData.user_id).single(),
        supabase.from("service_reviews").select("rating").eq("service_id", serviceId),
      ]);

      const reviews = reviewsRes.data || [];
      const calculatedAvg = reviews.length > 0
        ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
        : 0;

      setFullService({
        ...serviceData,
        owner_name: profileRes.data?.full_name || "Prestadora",
        avg_rating: Math.round(calculatedAvg * 10) / 10,
        review_count: reviews.length,
      });
    }
    setLoading(false);
  };

  const handleClick = async () => {
    await loadFullService();
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="card-maridaas p-4 w-full text-left hover:shadow-elevated transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar-maridaas flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{ownerName}</p>
            </div>
          </div>
          {avgRating > 0 && (
            <div className="flex items-center gap-1 text-secondary">
              <Star className="w-4 h-4 fill-secondary" />
              <span className="text-sm font-medium">{avgRating}</span>
            </div>
          )}
        </div>
      </button>

      {showModal && fullService && (
        <ServiceDetailModal
          service={fullService}
          currentUserId={currentUserId}
          onClose={() => setShowModal(false)}
          onUpdate={() => loadFullService()}
        />
      )}
    </>
  );
};

export default ServiceClickableCard;
