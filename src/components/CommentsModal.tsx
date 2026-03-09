import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Send, Trash2, MoreVertical, Edit2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import ProfilePreviewPopup from "./ProfilePreviewPopup";
import UserBadge from "./UserBadge";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
}

interface CommentsModalProps {
  postId: string;
  postAuthor: string;
  postContent: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onCommentAdded?: () => void;
  canModerate?: boolean;
  isVisitor?: boolean;
}

const CommentsModal = ({
  postId,
  postAuthor,
  postContent,
  isOpen,
  onClose,
  currentUserId,
  onCommentAdded,
  canModerate = false,
  isVisitor = false,
}: CommentsModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
            author_avatar: profileData?.[0]?.avatar_url || null,
          };
        })
      );
      setComments(commentsWithAuthors);
    }
    setLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId || isVisitor) return;

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

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Comentário deletado" });
      loadComments();
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !editingCommentId || savingEdit) return;
    if (editContent.length > 500) {
      toast({ title: "Texto muito longo", description: "O limite é de 500 caracteres.", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase
      .from("post_comments")
      .update({ content: editContent.trim() })
      .eq("id", editingCommentId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Comentário atualizado" });
      setEditingCommentId(null);
      setEditContent("");
      loadComments();
    }
    setSavingEdit(false);
  };

  const handleProfileClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <>
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
            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{postContent}</p>
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
              comments.map((comment) => {
                const isOwner = currentUserId === comment.user_id;
                const canDelete = isOwner || canModerate;
                const isEditingThis = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className="flex gap-2">
                    <button 
                      onClick={() => handleProfileClick(comment.user_id)}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity overflow-hidden"
                    >
                      {comment.author_avatar ? (
                        <img 
                          src={comment.author_avatar} 
                          alt={comment.author_name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleProfileClick(comment.user_id)}
                            className="font-semibold text-sm hover:text-primary transition-colors"
                          >
                            {comment.author_name}
                          </button>
                          <UserBadge userId={comment.user_id} />
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {(isOwner || canDelete) && !isEditingThis && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                                <MoreVertical className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isOwner && (
                                <DropdownMenuItem onClick={() => handleEditComment(comment)}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      
                      {/* Comment content - Editable or Static */}
                      {isEditingThis ? (
                        <div className="space-y-2 mt-1">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[60px] resize-none text-sm"
                            maxLength={500}
                            autoFocus
                          />
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${editContent.length > 450 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {editContent.length}/500
                            </span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={savingEdit}>
                                <X className="w-3 h-3 mr-1" /> Cancelar
                              </Button>
                              <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim() || savingEdit}>
                                <Check className="w-3 h-3 mr-1" /> {savingEdit ? "..." : "Salvar"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Adicionar comentário */}
          {currentUserId && !isVisitor && (
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
          {isVisitor && (
            <div className="text-center py-2 text-sm text-muted-foreground">
              Visitantes não podem comentar
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedUserId && (
        <ProfilePreviewPopup
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
};

export default CommentsModal;
