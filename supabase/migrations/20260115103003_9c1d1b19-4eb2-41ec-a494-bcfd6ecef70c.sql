-- Create a function for global user search that returns basic public info
CREATE OR REPLACE FUNCTION public.search_users_global(search_term text)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  neighborhood text,
  city text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.neighborhood,
    p.city
  FROM public.profiles p
  WHERE p.full_name ILIKE '%' || search_term || '%'
  ORDER BY p.full_name
  LIMIT 20;
$$;