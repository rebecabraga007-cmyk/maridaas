import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, MessageCircle, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PostCardProps {
  post: {
    id: string;
    author: string;
    content: string;
    createdAt: Date;
    likes: number;
    comments: number;
    userId: string;
  };
  currentUserId?: string;
  onLikeChange?: () => void;
}

const PostCard = ({ post, currentUserId, onLikeChange }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIfLiked();
  }, [post.id, currentUserId]);

  const checkIfLiked = async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    setLiked(!!data);
  };

  const handleLike = async () => {
    if (!currentUserId || loading) return;

    setLoading(true);

    if (liked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);

      setLikes(likes - 1);
      setLiked(false);
    } else {
      await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: currentUserId,
      });

      setLikes(likes + 1);
      setLiked(true);
    }

    setLoading(false);
    onLikeChange?.();
  };

  const timeAgo = formatDistanceToNow(post.createdAt, {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="card-maridaas p-4">
      <div className="flex gap-3">
        <div className="avatar-maridaas flex-shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">{post.author}</span>
            <span className="text-xs text-muted-foreground">• {timeAgo}</span>
          </div>
          <p className="text-foreground whitespace-pre-wrap break-words">{post.content}</p>
          
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border">
            <button 
              onClick={handleLike}
              disabled={loading}
              className={`flex items-center gap-2 text-sm transition-colors ${
                liked ? "text-destructive" : "text-muted-foreground hover:text-destructive"
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
              <span>{likes}</span>
            </button>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span>{post.comments}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;