
-- Performance indexes (without trgm)
CREATE INDEX IF NOT EXISTS idx_posts_neighborhood_created ON public.posts (neighborhood_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_profiles_primary_neighborhood ON public.profiles (primary_neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_profiles_secondary_neighborhood ON public.profiles (secondary_neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_services_neighborhood_active ON public.services (neighborhood_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_service_reviews_service_id ON public.service_reviews (service_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_user_messages_receiver_unread ON public.user_messages (receiver_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_date ON public.user_sessions (session_date);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits (key, window_start);

-- Paginated get_profiles_public
CREATE OR REPLACE FUNCTION public.get_profiles_public(_limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, full_name text, bio text, neighborhood text, city text, avatar_url text, primary_neighborhood_id uuid, secondary_neighborhood_id uuid, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id, p.full_name, p.bio, p.neighborhood, p.city,
    p.avatar_url, p.primary_neighborhood_id, p.secondary_neighborhood_id, p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT LEAST(_limit, 100)
  OFFSET _offset;
$$;

-- Paginated search_users_global
CREATE OR REPLACE FUNCTION public.search_users_global(search_term text, _limit integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, full_name text, neighborhood text, city text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id, p.full_name, p.neighborhood, p.city
  FROM public.profiles p
  WHERE 
    auth.uid() IS NOT NULL
    AND p.full_name ILIKE '%' || public.sanitize_like_input(search_term) || '%'
  ORDER BY p.full_name
  LIMIT LEAST(_limit, 50);
$$;

-- Self-deletion function (LGPD)
CREATE OR REPLACE FUNCTION public.delete_own_account()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
  RETURN true;
END;
$$;
