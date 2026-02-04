-- =====================================================
-- FIX: Remove Security Definer View warning
-- Replace view with direct function usage (view pattern is not needed)
-- =====================================================

-- Drop the security definer view (this was causing the warning)
DROP VIEW IF EXISTS public.profiles_public;

-- The get_profiles_public() function is already secure and should be used directly
-- No view is needed - callers should use: SELECT * FROM get_profiles_public()

-- Add search_path to sanitize_like_input function to fix function_search_path_mutable warning
CREATE OR REPLACE FUNCTION public.sanitize_like_input(input_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
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