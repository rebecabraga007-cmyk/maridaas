-- Drop and recreate the services delete policy
DROP POLICY IF EXISTS "Users and moderators can delete services" ON public.services;

CREATE POLICY "Users and moderators can delete services"
ON public.services
FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_moderator_for_neighborhood(auth.uid(), neighborhood_id)
);