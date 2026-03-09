import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import PostCard from "@/components/PostCard";
import PostSkeleton from "@/components/PostSkeleton";

interface Post {
  id: string;
  author: string;
  content: string;
  created_at: string;
  user_id: string;
  avatar_url: string | null;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
}

interface FeedPostListProps {
  posts: Post[];
  currentUserId?: string;
  canModerate: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReload: () => void;
}

export default function FeedPostList({
  posts,
  currentUserId,
  canModerate,
  loadingMore,
  hasMore,
  onLoadMore,
  onReload,
}: FeedPostListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div className="space-y-4">
      {loadingMore && posts.length === 0 && (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      )}
      
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={{
            id: p.id,
            author: p.author,
            content: p.content,
            createdAt: new Date(p.created_at),
            likes: p.likes_count,
            comments: p.comments_count,
            userId: p.user_id,
            avatarUrl: p.avatar_url,
            imageUrl: p.image_url,
          }}
          currentUserId={currentUserId}
          onLikeChange={onReload}
          onPostDeleted={onReload}
          onPostUpdated={onReload}
          canModerate={canModerate}
        />
      ))}
      
      {posts.length === 0 && !loadingMore && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">Nenhuma postagem ainda 📝</p>
          <p className="text-sm">Seja a primeira a compartilhar algo!</p>
        </div>
      )}
      
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {loadingMore && posts.length > 0 && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!hasMore && posts.length > 0 && (
          <p className="text-sm text-muted-foreground">Você viu todas as postagens 🎉</p>
        )}
      </div>
    </div>
  );
}
