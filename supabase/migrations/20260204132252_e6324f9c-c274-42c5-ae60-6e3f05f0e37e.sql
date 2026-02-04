-- Fix 1: Add RLS to profiles_public view by recreating it as a proper secured view
-- Views with security_invoker=true inherit RLS from the base table, but we need
-- to ensure only authenticated users can access it

-- Drop the existing view and recreate with proper security
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate view with security_invoker which respects underlying table RLS
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  bio,
  neighborhood,
  city,
  avatar_url,
  primary_neighborhood_id,
  secondary_neighborhood_id,
  created_at
FROM public.profiles;

-- Grant SELECT only to authenticated role (not anon)
GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;

-- Add comment
COMMENT ON VIEW public.profiles_public IS 'Secure public view of profiles - excludes sensitive PII (CPF, birth_date, address, cep, whatsapp, instagram). Only accessible to authenticated users.';

-- Fix 2: Add additional protection to profiles table
-- Revoke all access from anon role to ensure no anonymous access
REVOKE ALL ON public.profiles FROM anon;

-- Add a policy that denies all access from anonymous users explicitly
-- (This is defense in depth - anon already can't access due to RLS)
DO $$ 
BEGIN
  -- Drop existing policy if it exists to avoid conflicts
  DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
END $$;

CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);