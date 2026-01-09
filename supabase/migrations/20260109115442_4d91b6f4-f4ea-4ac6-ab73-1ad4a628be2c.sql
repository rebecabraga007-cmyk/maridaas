-- Atualizar policies para exigir autenticação
-- Isso corrige as vulnerabilidades de acesso não autenticado

-- Posts: exigir autenticação
DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON public.posts;
CREATE POLICY "Posts are viewable by authenticated users"
ON public.posts
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Post likes: exigir autenticação
DROP POLICY IF EXISTS "Post likes are viewable by authenticated users" ON public.post_likes;
CREATE POLICY "Post likes are viewable by authenticated users"
ON public.post_likes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Post comments: exigir autenticação
DROP POLICY IF EXISTS "Post comments are viewable by authenticated users" ON public.post_comments;
CREATE POLICY "Post comments are viewable by authenticated users"
ON public.post_comments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Services: exigir autenticação
DROP POLICY IF EXISTS "Services are viewable by authenticated users" ON public.services;
CREATE POLICY "Services are viewable by authenticated users"
ON public.services
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Service reviews: exigir autenticação
DROP POLICY IF EXISTS "Service reviews are viewable by authenticated users" ON public.service_reviews;
CREATE POLICY "Service reviews are viewable by authenticated users"
ON public.service_reviews
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Neighborhoods: exigir autenticação
DROP POLICY IF EXISTS "Neighborhoods are viewable by everyone" ON public.neighborhoods;
CREATE POLICY "Neighborhoods are viewable by authenticated users"
ON public.neighborhoods
FOR SELECT
USING (auth.uid() IS NOT NULL);