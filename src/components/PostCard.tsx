import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, MessageCircle, User, MoreVertical, Trash2, Edit2, X, Check, Share, Flag } from "lucide-react";
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import CommentsModal from "./CommentsModal";
import ProfilePreviewPopup from "./ProfilePreviewPopup";
import UserBadge from "./UserBadge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface PostCardProps {
  post: {
    id: string;
    author: string;
    content: string;
    createdAt: Date;
    likes: number;
    comments: number;
    userId: string;
    neighborhoodId?: string;
    avatarUrl?: string | null;
    imageUrl?: string | null;
  };
  currentUserId?: string;
  onLikeChange?: () => void;
  onPostDeleted?: () => void;
  onPostUpdated?: () => void;
  canModerate?: boolean;
  isVisitor?: boolean;
}

const PostCard = ({ post, currentUserId, onLikeChange, onPostDeleted, onPostUpdated, canModerate = false, isVisitor = false }: PostCardProps) => {
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);

  const isOwner = currentUserId === post.userId;
  const canDelete = isOwner || canModerate;
  const [sharing, setSharing] = useState(false);

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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId || loading || isVisitor) return;

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

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProfilePopup(true);
  };

  const handleCommentAdded = () => {
    setCommentsCount(commentsCount + 1);
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);

    const { error } = await supabase.from("posts").delete().eq("id", post.id);

    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Postagem deletada" });
      onPostDeleted?.();
    }
    setDeleting(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditContent(post.content);
    setIsEditing(true);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editContent.trim() || saving) return;
    if (editContent.length > 240) {
      toast({ title: "Texto muito longo", description: "O limite é de 240 caracteres.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("posts")
      .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq("id", post.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Postagem atualizada" });
      setIsEditing(false);
      onPostUpdated?.();
    }
    setSaving(false);
  };

  const handleCardClick = () => {
    if (isEditing) return;
    setShowComments(true);
  };

  const handleCommentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(true);
  };

  const timeAgo = formatDistanceToNow(post.createdAt, {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <>
      <div 
        className="card-maridaas p-4 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={handleCardClick}
      >
        <div className="flex gap-3">
          <button 
            onClick={handleProfileClick}
            className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden"
          >
            {post.avatarUrl ? (
              <img src={post.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </button>
          <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleProfileClick}
                    className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    {post.author}
                  </button>
                  <UserBadge userId={post.userId} />
                  <span className="text-xs text-muted-foreground">• {timeAgo}</span>
                </div>
              {(isOwner || canDelete) && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && (
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                        disabled={deleting}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleting ? "Deletando..." : "Deletar"}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {/* Content - Editable or Static */}
            {isEditing ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={240}
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${editContent.length > 200 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {editContent.length}/240
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={saving}>
                      <X className="w-4 h-4 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim() || saving}>
                      <Check className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-foreground whitespace-pre-wrap break-words">{post.content}</p>
            )}
            
            {/* Post image */}
            {post.imageUrl && (
              <div className="mt-3 rounded-xl overflow-hidden aspect-video max-h-80">
                <img src={post.imageUrl} alt="Post image" className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border">
              <button 
                onClick={handleLike}
                disabled={loading || isVisitor}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
                } ${isVisitor ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                <span>{likes}</span>
              </button>
              <button 
                onClick={handleCommentsClick}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{commentsCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CommentsModal
        postId={post.id}
        postAuthor={post.author}
        postContent={post.content}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        currentUserId={currentUserId}
        onCommentAdded={handleCommentAdded}
        canModerate={canModerate}
        isVisitor={isVisitor}
      />

      <ProfilePreviewPopup
        userId={post.userId}
        isOpen={showProfilePopup}
        onClose={() => setShowProfilePopup(false)}
        currentUserId={currentUserId}
      />
    </>
  );
};

export default React.memo(PostCard);
