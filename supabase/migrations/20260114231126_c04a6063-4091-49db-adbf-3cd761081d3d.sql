-- Add image_url column to posts table for photo attachments
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN public.posts.image_url IS 'URL of the image attached to the post';