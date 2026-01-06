import { Star, User } from "lucide-react";

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    service: string;
    rating: number;
  };
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  return (
    <div className="flex-shrink-0 w-28 card-maridaas p-4 text-center">
      <div className="avatar-maridaas mx-auto mb-3">
        <User className="w-5 h-5" />
      </div>
      <p className="font-semibold text-sm text-foreground truncate">{service.name}</p>
      <p className="text-xs text-muted-foreground mb-2 truncate">{service.service}</p>
      <div className="flex items-center justify-center gap-1">
        <Star className="w-3 h-3 text-secondary fill-secondary" />
        <span className="text-xs font-medium text-foreground">{service.rating}</span>
      </div>
    </div>
  );
};

export default ServiceCard;