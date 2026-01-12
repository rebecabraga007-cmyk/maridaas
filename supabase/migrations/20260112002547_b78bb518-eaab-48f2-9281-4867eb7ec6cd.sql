-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-uploads bucket
CREATE POLICY "Anyone can view user uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-uploads');

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image_url to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ensure scheduled_notifications table is set up correctly (it exists but let's verify)
-- Already exists from previous migrations

-- Add notification_read table to track which notifications users have seen
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL REFERENCES public.scheduled_notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Users can mark their own notifications as read
CREATE POLICY "Users can insert their own reads"
ON public.notification_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reads"
ON public.notification_reads FOR SELECT
USING (auth.uid() = user_id);

-- Create admin function to delete service reviews
CREATE OR REPLACE FUNCTION public.admin_delete_review(review_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  DELETE FROM service_reviews WHERE id = review_id;
  RETURN TRUE;
END;
$$;