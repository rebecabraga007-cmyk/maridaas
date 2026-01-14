-- Drop the overly permissive same_neighborhood policy that exposes all fields
DROP POLICY IF EXISTS "Users can view profiles in same neighborhood" ON public.profiles;

-- Also drop the duplicate policy if it exists
DROP POLICY IF EXISTS "Users can only select own profile directly" ON public.profiles;

-- Keep only the policy that allows users to view their own full profile
-- The "Users can view their own full profile" policy already exists and is correct