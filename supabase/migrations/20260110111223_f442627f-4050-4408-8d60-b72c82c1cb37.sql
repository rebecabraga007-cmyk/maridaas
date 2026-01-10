-- 1. Add secondary_neighborhood_id to profiles for 2 neighborhoods support
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS secondary_neighborhood_id uuid REFERENCES public.neighborhoods(id);

-- 2. Drop existing policy that depends on same_neighborhood
DROP POLICY IF EXISTS "Users can view profiles in same neighborhood" ON public.profiles;

-- 3. Drop and recreate same_neighborhood function
DROP FUNCTION IF EXISTS public.same_neighborhood(uuid);
CREATE OR REPLACE FUNCTION public.same_neighborhood(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1
    JOIN public.profiles p2 ON (
      p1.primary_neighborhood_id = p2.primary_neighborhood_id OR
      p1.primary_neighborhood_id = p2.secondary_neighborhood_id OR
      p1.secondary_neighborhood_id = p2.primary_neighborhood_id OR
      (p1.secondary_neighborhood_id IS NOT NULL AND p1.secondary_neighborhood_id = p2.secondary_neighborhood_id)
    )
    WHERE p1.user_id = auth.uid()
      AND p2.user_id = target_user_id
      AND (p1.primary_neighborhood_id IS NOT NULL OR p1.secondary_neighborhood_id IS NOT NULL)
  )
$$;

-- 4. Recreate profiles visibility policy
CREATE POLICY "Users can view profiles in same neighborhood"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id OR public.same_neighborhood(user_id));

-- 5. Drop and recreate get_public_profile to include secondary_neighborhood_id
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE(
  user_id uuid, 
  full_name text, 
  bio text, 
  neighborhood text, 
  city text, 
  instagram text, 
  whatsapp text, 
  avatar_url text, 
  primary_neighborhood_id uuid,
  secondary_neighborhood_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.bio,
    p.neighborhood,
    p.city,
    p.instagram,
    p.whatsapp,
    p.avatar_url,
    p.primary_neighborhood_id,
    p.secondary_neighborhood_id
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- 6. Allow admins to manage neighborhoods
DROP POLICY IF EXISTS "Admins can insert neighborhoods" ON public.neighborhoods;
DROP POLICY IF EXISTS "Admins can update neighborhoods" ON public.neighborhoods;
DROP POLICY IF EXISTS "Admins can delete neighborhoods" ON public.neighborhoods;

CREATE POLICY "Admins can insert neighborhoods"
ON public.neighborhoods FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update neighborhoods"
ON public.neighborhoods FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete neighborhoods"
ON public.neighborhoods FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));