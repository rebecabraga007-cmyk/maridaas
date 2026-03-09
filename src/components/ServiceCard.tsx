import { Star, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ServiceDetailModal from "./ServiceDetailModal";

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    service: string;
    rating: number;
    image_url?: string | null;
    avatar_url?: string | null;
  };
  clickable?: boolean;
}

interface FullService {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  whatsapp: string | null;
  instagram: string | null;
  image_url: string | null;
  owner_name: string;
  owner_avatar: string | null;
  avg_rating: number;
  review_count: number;
}

const ServiceCard = ({ service, clickable = true }: ServiceCardProps) => {
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
      .select("id, title, description, user_id, whatsapp, instagram, image_url")
      .eq("id", service.id)
      .single();

    if (serviceData) {
      const [profileRes, reviewsRes] = await Promise.all([
        supabase.rpc("get_public_profile", { target_user_id: serviceData.user_id }),
        supabase.from("service_reviews").select("rating").eq("service_id", service.id),
      ]);

      const profileData = profileRes.data?.[0];
      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length > 0
        ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
        : 0;

      setFullService({
        ...serviceData,
        owner_name: profileData?.full_name || "Prestadora",
        owner_avatar: profileData?.avatar_url || null,
        avg_rating: Math.round(avgRating * 10) / 10,
        review_count: reviews.length,
      });
    }
    setLoading(false);
  };

  const handleClick = async () => {
    if (clickable) {
      await loadFullService();
      setShowModal(true);
    }
  };

  // Determine which image to show: service image or avatar
  const displayImage = service.image_url || service.avatar_url;

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex-shrink-0 w-28 card-maridaas p-4 text-center ${
          clickable ? "cursor-pointer hover:shadow-elevated" : ""
        }`}
        disabled={!clickable || loading}
      >
        <div className="w-14 h-14 rounded-full mx-auto mb-3 bg-muted flex items-center justify-center overflow-hidden">
          {displayImage ? (
            <img
              src={displayImage}
              alt={service.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <p className="font-semibold text-sm text-foreground truncate">{service.name}</p>
        <p className="text-xs text-muted-foreground mb-2 truncate">{service.service}</p>
        <div className="flex items-center justify-center gap-1">
          <Star className="w-3 h-3 text-secondary fill-secondary" />
          <span className="text-xs font-medium text-foreground">{service.rating}</span>
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

export default React.memo(ServiceCard);