-- Add image_url and link_url columns to announcements table
ALTER TABLE public.announcements 
ADD COLUMN image_url text,
ADD COLUMN link_url text;