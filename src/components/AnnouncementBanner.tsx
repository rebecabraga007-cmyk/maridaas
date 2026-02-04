import { Megaphone, X, ExternalLink } from "lucide-react";
import { useState } from "react";

interface AnnouncementBannerProps {
  announcement: {
    id: string;
    title: string;
    content: string;
    image_url?: string | null;
    link_url?: string | null;
  };
}

const AnnouncementBanner = ({ announcement }: AnnouncementBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleLinkClick = () => {
    if (announcement.link_url) {
      window.open(announcement.link_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="mb-6 card-maridaas p-4 bg-gold-light border-secondary">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-5 h-5 text-secondary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground">{announcement.title}</h3>
            <button 
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
          
          {announcement.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden">
              <img 
                src={announcement.image_url} 
                alt={announcement.title}
                className="w-full max-h-48 object-cover"
              />
            </div>
          )}
          
          {announcement.link_url && (
            <button
              onClick={handleLinkClick}
              className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Acessar link
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;