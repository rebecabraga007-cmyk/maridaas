import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ImagePlus, X, User as UserIcon } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

interface FeedPostComposerProps {
  userId: string;
  posting: boolean;
  onPost: (content: string, imageUrl: string) => void;
}

export default function FeedPostComposer({ userId, posting, onPost }: FeedPostComposerProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onPost(content.trim(), imageUrl);
    setContent("");
    setImageUrl("");
    setShowImageUpload(false);
  };

  return (
    <div className="card-maridaas p-4 mb-4">
      <div className="flex gap-3">
        <div className="avatar-maridaas flex-shrink-0">
          <UserIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <Textarea
            placeholder="O que está acontecendo no bairro?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-0 rounded-xl"
            maxLength={240}
          />

          {imageUrl && (
            <div className="relative mt-3 rounded-xl overflow-hidden">
              <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
              <button
                onClick={() => { setImageUrl(""); setShowImageUpload(false); }}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {showImageUpload && !imageUrl && (
            <div className="mt-3">
              <ImageUpload
                userId={userId}
                folder="posts"
                onImageUploaded={(url) => { setImageUrl(url); if (url) setShowImageUpload(false); }}
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImageUpload(!showImageUpload)}
                className={`p-2 rounded-lg transition-colors ${showImageUpload ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-muted"}`}
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              <span className={`text-xs ${content.length > 200 ? "text-destructive" : "text-muted-foreground"}`}>
                {content.length}/240
              </span>
            </div>
            <Button onClick={handleSubmit} size="sm" className="btn-maridaas" disabled={!content.trim() || posting}>
              <Send className="w-4 h-4 mr-2" />
              {posting ? "..." : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
