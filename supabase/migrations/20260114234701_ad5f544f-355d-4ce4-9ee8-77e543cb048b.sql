-- Create a function to count members in a neighborhood
-- This uses SECURITY DEFINER to bypass RLS for counting purposes
CREATE OR REPLACE FUNCTION public.count_neighborhood_members(_neighborhood_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE primary_neighborhood_id = _neighborhood_id 
     OR secondary_neighborhood_id = _neighborhood_id;
$$;