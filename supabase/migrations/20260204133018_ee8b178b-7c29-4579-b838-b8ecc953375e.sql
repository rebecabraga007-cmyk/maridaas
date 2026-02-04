-- =====================================================
-- SECURITY FIX: Secure profiles_public view against injection and exposure
-- =====================================================

-- Drop the existing view first
DROP VIEW IF EXISTS public.profiles_public;

-- Create a SECURITY DEFINER function to safely return public profile data
-- This prevents direct access to the profiles table and filters sensitive data
CREATE OR REPLACE FUNCTION public.get_profiles_public()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  bio text,
  neighborhood text,
  city text,
  avatar_url text,
  primary_neighborhood_id uuid,
  secondary_neighborhood_id uuid,
  created_at timestamptz
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
    p.avatar_url,
    p.primary_neighborhood_id,
    p.secondary_neighborhood_id,
    p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL;  -- Only authenticated users can access
$$;

-- Grant execute permission only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profiles_public() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profiles_public() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_profiles_public() FROM public;

-- Recreate view using the secure function
CREATE VIEW public.profiles_public AS
SELECT * FROM public.get_profiles_public();

-- Add security comment
COMMENT ON VIEW public.profiles_public IS 
  'Secure public view of profiles - excludes sensitive PII (CPF, birth_date, address, cep). 
   Only accessible to authenticated users via SECURITY DEFINER function.';

COMMENT ON FUNCTION public.get_profiles_public() IS
  'Security definer function that returns public profile data only to authenticated users.
   Prevents direct access to the profiles table and filters out sensitive fields.';

-- Ensure the view grants are correct
GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;

-- =====================================================
-- Additional security: Input sanitization function for searches
-- =====================================================

-- Create a function to sanitize search inputs (prevents SQL injection in LIKE patterns)
CREATE OR REPLACE FUNCTION public.sanitize_like_input(input_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT 
    CASE 
      WHEN input_text IS NULL THEN ''
      ELSE regexp_replace(
        regexp_replace(
          regexp_replace(input_text, '\\', '\\\\', 'g'),
          '%', '\\%', 'g'
        ),
        '_', '\\_', 'g'
      )
    END;
$$;

COMMENT ON FUNCTION public.sanitize_like_input(text) IS
  'Sanitizes input for safe use in LIKE patterns. Escapes %, _, and \\ characters.';

-- =====================================================
-- Update search_users_global to use sanitized input
-- =====================================================

CREATE OR REPLACE FUNCTION public.search_users_global(search_term text)
RETURNS TABLE(user_id uuid, full_name text, neighborhood text, city text)
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
  WHERE 
    -- Only allow authenticated users to search
    auth.uid() IS NOT NULL
    -- Use sanitized input to prevent LIKE injection
    AND p.full_name ILIKE '%' || public.sanitize_like_input(search_term) || '%'
  ORDER BY p.full_name
  LIMIT 20;
$$;

COMMENT ON FUNCTION public.search_users_global(text) IS
  'Secure user search function with input sanitization to prevent LIKE injection attacks.
   Only accessible to authenticated users.';