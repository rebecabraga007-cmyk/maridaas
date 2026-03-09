
-- Drop legacy VAPID push_subscriptions table (replaced by OneSignal)
DROP TABLE IF EXISTS public.push_subscriptions;

-- Create rate_limits table for edge function protection
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  requests integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(key)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);

-- Auto-cleanup old entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
$$;

-- Create cleanup job for user_sessions (keep only last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.user_sessions WHERE session_date < CURRENT_DATE - interval '90 days';
$$;
