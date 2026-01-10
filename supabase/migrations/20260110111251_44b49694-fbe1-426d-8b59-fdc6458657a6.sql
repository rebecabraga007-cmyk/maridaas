-- 1. Create user_messages table for private messages between users (if not exists)
CREATE TABLE IF NOT EXISTS public.user_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_messages
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.user_messages;
CREATE POLICY "Users can view their own messages"
ON public.user_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.user_messages;
CREATE POLICY "Users can send messages"
ON public.user_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete their own sent messages" ON public.user_messages;
CREATE POLICY "Users can delete their own sent messages"
ON public.user_messages FOR DELETE
USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receiver can mark messages as read" ON public.user_messages;
CREATE POLICY "Receiver can mark messages as read"
ON public.user_messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- 2. Add moderator_neighborhood_id to user_roles (moderator is restricted to their fixed neighborhood)
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS moderator_neighborhood_id uuid REFERENCES public.neighborhoods(id);

-- 3. Create function to check if user is moderator for a specific neighborhood
CREATE OR REPLACE FUNCTION public.is_moderator_for_neighborhood(_user_id uuid, _neighborhood_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'moderator'
      AND (moderator_neighborhood_id = _neighborhood_id OR moderator_neighborhood_id IS NULL)
  )
$$;

-- 4. Create function to check if user can interact in a neighborhood (primary or secondary)
CREATE OR REPLACE FUNCTION public.can_interact_in_neighborhood(_user_id uuid, _neighborhood_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND (primary_neighborhood_id = _neighborhood_id OR secondary_neighborhood_id = _neighborhood_id)
  )
$$;

-- 5. Update posts insert policy to allow posting in primary OR secondary neighborhood
DROP POLICY IF EXISTS "Users can create posts in their neighborhood" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts in their neighborhoods" ON public.posts;
CREATE POLICY "Users can create posts in their neighborhoods"
ON public.posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  public.can_interact_in_neighborhood(auth.uid(), neighborhood_id)
);

-- 6. Update services insert policy for multiple neighborhoods
DROP POLICY IF EXISTS "Users can create services in their neighborhood" ON public.services;
DROP POLICY IF EXISTS "Users can create services in their neighborhoods" ON public.services;
CREATE POLICY "Users can create services in their neighborhoods"
ON public.services FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  public.can_interact_in_neighborhood(auth.uid(), neighborhood_id)
);

-- 7. Drop existing delete policies and recreate for posts
DROP POLICY IF EXISTS "Moderators can delete any post" ON public.posts;
DROP POLICY IF EXISTS "Moderators can delete posts in their neighborhood" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

CREATE POLICY "Users and moderators can delete posts"
ON public.posts FOR DELETE
USING (
  auth.uid() = user_id OR
  public.has_role(auth.uid(), 'admin') OR
  public.is_moderator_for_neighborhood(auth.uid(), neighborhood_id)
);

-- 8. Add update policy for comments
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
CREATE POLICY "Users can update their own comments"
ON public.post_comments FOR UPDATE
USING (auth.uid() = user_id);

-- 9. Drop and recreate delete policy for comments to include moderators
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Moderators can delete comments in their neighborhood" ON public.post_comments;

CREATE POLICY "Users and moderators can delete comments"
ON public.post_comments FOR DELETE
USING (
  auth.uid() = user_id OR
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id 
    AND public.is_moderator_for_neighborhood(auth.uid(), p.neighborhood_id)
  )
);

-- 10. Drop and recreate delete policy for services
DROP POLICY IF EXISTS "Users can delete their own services" ON public.services;
DROP POLICY IF EXISTS "Moderators can delete services in their neighborhood" ON public.services;

CREATE POLICY "Users and moderators can delete services"
ON public.services FOR DELETE
USING (
  auth.uid() = user_id OR
  public.has_role(auth.uid(), 'admin') OR
  public.is_moderator_for_neighborhood(auth.uid(), neighborhood_id)
);