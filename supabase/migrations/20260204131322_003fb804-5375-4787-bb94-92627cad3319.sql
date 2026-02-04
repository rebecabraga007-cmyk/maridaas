-- Create a secure public view for profiles that only exposes non-sensitive fields
-- This provides defense-in-depth: even if RLS is misconfigured, sensitive data is not in this view

CREATE OR REPLACE VIEW public.profiles_public
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

-- Add a comment documenting that sensitive fields are intentionally excluded
COMMENT ON VIEW public.profiles_public IS 'Public view of profiles excluding sensitive PII (CPF, birth_date, address, cep, whatsapp, instagram). Use get_public_profile() function for controlled access to contact info based on neighborhood membership.';

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Revoke direct SELECT on profiles from anon role (extra safety)
REVOKE SELECT ON public.profiles FROM anon;