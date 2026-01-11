-- Create admin functions to get all profiles bypassing RLS
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  neighborhood text,
  city text,
  created_at timestamptz,
  primary_neighborhood_id uuid,
  secondary_neighborhood_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.neighborhood,
    p.city,
    p.created_at,
    p.primary_neighborhood_id,
    p.secondary_neighborhood_id
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;

-- Create function for admin to delete any post
CREATE OR REPLACE FUNCTION public.admin_delete_post(post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  DELETE FROM public.posts WHERE id = post_id;
  RETURN FOUND;
END;
$$;

-- Create function for admin to delete any service
CREATE OR REPLACE FUNCTION public.admin_delete_service(service_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  DELETE FROM public.services WHERE id = service_id;
  RETURN FOUND;
END;
$$;

-- Create function for admin to delete any comment
CREATE OR REPLACE FUNCTION public.admin_delete_comment(comment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  DELETE FROM public.post_comments WHERE id = comment_id;
  RETURN FOUND;
END;
$$;

-- Create function for admin to create posts in any neighborhood
CREATE OR REPLACE FUNCTION public.admin_create_post(
  _neighborhood_id uuid,
  _content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_post_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  INSERT INTO public.posts (user_id, neighborhood_id, content)
  VALUES (auth.uid(), _neighborhood_id, _content)
  RETURNING id INTO new_post_id;
  
  RETURN new_post_id;
END;
$$;

-- Create function for admin to get all posts
CREATE OR REPLACE FUNCTION public.admin_get_all_posts()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  neighborhood_id uuid,
  content text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.neighborhood_id, p.content, p.created_at
  FROM public.posts p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
  LIMIT 100;
$$;