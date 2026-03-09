import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";

interface ServiceItem {
  id: string;
  title: string;
  owner_name: string;
  avg_rating: number;
  image_url: string | null;
  owner_avatar: string | null;
}

interface FeedServiceCarouselProps {
  services: ServiceItem[];
}

export default function FeedServiceCarousel({ services }: FeedServiceCarouselProps) {
  const navigate = useNavigate();

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-bold text-foreground">Serviços no bairro</h2>
        <button onClick={() => navigate("/services")} className="text-sm text-primary flex items-center gap-1">
          Ver todos <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
        {services.map((s) => (
          <ServiceCard
            key={s.id}
            service={{
              id: s.id,
              name: s.owner_name,
              service: s.title,
              rating: s.avg_rating,
              image_url: s.image_url,
              avatar_url: s.owner_avatar,
            }}
          />
        ))}
        <button
          onClick={() => navigate("/services")}
          className="flex-shrink-0 w-28 h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs">Cadastrar</span>
        </button>
      </div>
    </section>
  );
}
