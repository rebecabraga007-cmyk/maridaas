-- Drop and recreate get_public_profile to check neighborhood membership for contact info
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(target_user_id uuid)
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
  secondary_neighborhood_id uuid,
  is_same_neighborhood boolean
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
    -- Only show contact info if viewer is in same neighborhood or is the owner
    CASE 
      WHEN p.user_id = auth.uid() THEN p.instagram
      WHEN same_neighborhood(p.user_id) THEN p.instagram
      ELSE NULL
    END as instagram,
    CASE 
      WHEN p.user_id = auth.uid() THEN p.whatsapp
      WHEN same_neighborhood(p.user_id) THEN p.whatsapp
      ELSE NULL
    END as whatsapp,
    p.avatar_url,
    p.primary_neighborhood_id,
    p.secondary_neighborhood_id,
    same_neighborhood(p.user_id) as is_same_neighborhood
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;