-- Drop the overly permissive SELECT policy on posts
DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON public.posts;

-- Create a restrictive policy: users can only view posts from their neighborhoods
-- or posts they created themselves, or if they're an admin
CREATE POLICY "Users can view posts in their neighborhoods"
  ON public.posts FOR SELECT
  USING (
    auth.uid() = user_id  -- Can always see own posts
    OR has_role(auth.uid(), 'admin'::app_role)  -- Admins can see all
    OR can_interact_in_neighborhood(auth.uid(), neighborhood_id)  -- User is member of the neighborhood
  );