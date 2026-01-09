-- Remover a policy que permite acesso irrestrito e manter apenas o acesso ao próprio perfil
DROP POLICY IF EXISTS "Users can view public info of others" ON public.profiles;

-- Agora apenas a policy "Users can view their own full profile" existe
-- Isso protege dados sensíveis, mas precisamos permitir acesso a dados públicos

-- Criar uma função para buscar dados públicos de perfis (sem CPF, address, birth_date, cep)
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  bio TEXT,
  neighborhood TEXT,
  city TEXT,
  instagram TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  primary_neighborhood_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.bio,
    p.neighborhood,
    p.city,
    p.instagram,
    p.whatsapp,
    p.avatar_url,
    p.primary_neighborhood_id
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO authenticated;

-- Adicionar policies faltantes para melhorar segurança

-- Deny INSERT on profiles (handled by trigger)
CREATE POLICY "Profiles are created by trigger only"
ON public.profiles
FOR INSERT
WITH CHECK (false);

-- Deny UPDATE/DELETE on user_sessions for users
CREATE POLICY "Users cannot update sessions"
ON public.user_sessions
FOR UPDATE
USING (false);

CREATE POLICY "Users cannot delete sessions"
ON public.user_sessions
FOR DELETE
USING (false);