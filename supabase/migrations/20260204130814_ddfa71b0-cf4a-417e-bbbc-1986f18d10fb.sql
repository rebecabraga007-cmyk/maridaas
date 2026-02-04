-- Create admin_get_full_profile function for admins to view complete user profiles
-- This includes sensitive data like CPF, birth_date, address that regular users cannot see

CREATE OR REPLACE FUNCTION public.admin_get_full_profile(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  cpf text,
  birth_date date,
  neighborhood text,
  city text,
  address text,
  cep text,
  whatsapp text,
  instagram text,
  avatar_url text,
  created_at timestamptz,
  bio text,
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
    p.cpf,
    p.birth_date,
    p.neighborhood,
    p.city,
    p.address,
    p.cep,
    p.whatsapp,
    p.instagram,
    p.avatar_url,
    p.created_at,
    p.bio,
    p.primary_neighborhood_id,
    p.secondary_neighborhood_id
  FROM profiles p
  WHERE p.user_id = target_user_id
    AND has_role(auth.uid(), 'admin')
$$;