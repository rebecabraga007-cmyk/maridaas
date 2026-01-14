-- Allow admins and moderators to delete service reviews
DROP POLICY IF EXISTS "Admins and moderators can delete reviews" ON public.service_reviews;

CREATE POLICY "Admins and moderators can delete reviews"
ON public.service_reviews
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_reviews.service_id
    AND is_moderator_for_neighborhood(auth.uid(), s.neighborhood_id)
  )
);