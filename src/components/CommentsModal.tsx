import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
}

interface CommentsModalProps {
  postId: string;
  postAuthor: string;
  postContent: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onCommentAdded?: () => void;
}

const CommentsModal = ({
  postId,
  postAuthor,
  postContent,
  isOpen,
  onClose,
  currentUserId,
  onCommentAdded,
}: CommentsModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("post_comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data) {
      const commentsWithAuthors = await Promise.all(
        data.map(async (comment) => {
          const { data: profileData } = await supabase
            .rpc("get_public_profile", { target_user_id: comment.user_id });
          return {
            ...comment,
            author_name: profileData?.[0]?.full_name || "Usuária",
          };
        })
      );
      setComments(commentsWithAuthors);
    }
    setLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    setSubmitting(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment("");
      loadComments();
      onCommentAdded?.();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Comentários
          </DialogTitle>
        </DialogHeader>

        {/* Post original */}
        <div className="bg-muted/50 rounded-xl p-3 mb-4">
          <p className="font-semibold text-sm text-foreground">{postAuthor}</p>
          <p className="text-sm text-foreground mt-1">{postContent}</p>
        </div>

        {/* Lista de comentários */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum comentário ainda</p>
              <p className="text-sm">Seja a primeira a comentar!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Adicionar comentário */}
        {currentUserId && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Textarea
              placeholder="Escreva um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] resize-none"
              maxLength={500}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              size="icon"
              className="btn-maridaas h-auto"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommentsModal;
