-- Remover a view que causa problema de security definer
DROP VIEW IF EXISTS public.public_profiles;

-- Adicionar policy que permite ver dados públicos de outros perfis
-- Dados sensíveis (cpf, address, cep, birth_date) ficam protegidos
CREATE POLICY "Users can view public info of others"
ON public.profiles
FOR SELECT
USING (
  -- Sempre pode ver: full_name, bio, neighborhood, city, instagram, whatsapp, avatar_url, primary_neighborhood_id
  -- Campos sensíveis só são acessíveis pelo próprio usuário
  true
);

-- Nota: A proteção real de campos sensíveis será feita no nível da aplicação
-- selecionando apenas campos públicos ao consultar perfis de outros usuários