-- Permitir que usuários do mesmo bairro vejam dados públicos uns dos outros
-- Isso é necessário para a funcionalidade de busca e feed funcionar

-- Primeiro, criar uma função para verificar se usuários estão no mesmo bairro
CREATE OR REPLACE FUNCTION public.same_neighborhood(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1
    JOIN public.profiles p2 ON p1.primary_neighborhood_id = p2.primary_neighborhood_id
    WHERE p1.user_id = auth.uid()
      AND p2.user_id = target_user_id
  )
$$;

-- Policy para permitir ver perfis do mesmo bairro (somente campos que vão ser consultados)
CREATE POLICY "Users can view profiles in same neighborhood"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR
  public.same_neighborhood(user_id)
);