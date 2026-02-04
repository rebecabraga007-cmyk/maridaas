-- Function to allow admin to delete user accounts
-- This will cascade delete all related data due to foreign key constraints
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  -- Prevent admin from deleting themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  -- Delete user from auth.users (this will cascade to profiles and other tables)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;