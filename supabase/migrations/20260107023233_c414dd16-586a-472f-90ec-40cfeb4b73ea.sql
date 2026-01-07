-- Add notifications_enabled column to profiles
ALTER TABLE public.profiles 
ADD COLUMN notifications_enabled BOOLEAN DEFAULT false;