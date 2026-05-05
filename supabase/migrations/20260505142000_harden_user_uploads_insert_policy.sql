DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;

CREATE POLICY "Users can upload only to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-uploads'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);
