-- Remove premium/Stripe gating from services and drop subscription infra
DROP POLICY IF EXISTS "Premium users can create services in their neighborhoods" ON public.services;

CREATE POLICY "Users can create services in their neighborhoods"
ON public.services
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND can_interact_in_neighborhood(auth.uid(), neighborhood_id)
);

DROP FUNCTION IF EXISTS public.is_premium_user(uuid);
DROP TABLE IF EXISTS public.subscriptions CASCADE;