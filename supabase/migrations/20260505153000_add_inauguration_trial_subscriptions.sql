CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trialing',
  product_id TEXT,
  stripe_customer_id TEXT,
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  promotion_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS promotion_name TEXT;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.grant_inauguration_trial(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at TIMESTAMP WITH TIME ZONE := now();
  v_ends_at TIMESTAMP WITH TIME ZONE := now() + interval '60 days';
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    status,
    trial_started_at,
    trial_ends_at,
    promotion_name,
    expires_at
  )
  VALUES (
    _user_id,
    'trialing',
    v_started_at,
    v_ends_at,
    'promocao_inauguracao_60_dias',
    v_ends_at
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND (
        (s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now()))
        OR (s.status = 'trialing' AND s.trial_ends_at > now())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_neighborhood_id UUID;
BEGIN
  INSERT INTO public.neighborhoods (name, city, created_by)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'neighborhood', 'Centro'),
    COALESCE(NEW.raw_user_meta_data ->> 'city', 'Cidade'),
    NEW.id
  )
  ON CONFLICT (name, city) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_neighborhood_id;

  INSERT INTO public.profiles (
    user_id,
    full_name,
    cpf,
    birth_date,
    cep,
    city,
    neighborhood,
    address,
    primary_neighborhood_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'cpf', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'birth_date', '')::DATE,
    NEW.raw_user_meta_data ->> 'cep',
    COALESCE(NEW.raw_user_meta_data ->> 'city', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'neighborhood', ''),
    NEW.raw_user_meta_data ->> 'address',
    v_neighborhood_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.grant_inauguration_trial(NEW.id);

  RETURN NEW;
END;
$$;
