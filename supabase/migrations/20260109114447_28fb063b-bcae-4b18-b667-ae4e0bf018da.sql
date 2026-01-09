-- Corrigir RLS da tabela profiles para proteger dados sensíveis
-- Permitir que usuários vejam apenas informações públicas de outros usuários

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Usuários podem ver seu próprio perfil completo
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem ver informações públicas de outros perfis (nome, bio, bairro, cidade)
-- Cria uma view para dados públicos em vez de expor CPF, endereço, etc.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  full_name,
  bio,
  neighborhood,
  city,
  instagram,
  whatsapp,
  avatar_url,
  primary_neighborhood_id
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- Tabela para tracking de visitas/sessões do app
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint para evitar múltiplas entradas por dia
ALTER TABLE public.user_sessions 
ADD CONSTRAINT unique_user_session_per_day UNIQUE (user_id, session_date);

-- RLS para user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela para notificações agendadas
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'neighborhood', 'user')),
  target_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications"
ON public.scheduled_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Permitir DELETE em friendships para usuários
CREATE POLICY "Users can delete their friendships"
ON public.friendships
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);