-- =============================================
-- MIGRAÇÃO 002: Adiciona campos de Arquétipos e DISC
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- Campos visíveis para participante (arquétipos)
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS primary_archetype TEXT,
ADD COLUMN IF NOT EXISTS secondary_archetype TEXT,
ADD COLUMN IF NOT EXISTS archetype_description TEXT;

-- Campos OCULTOS para closers (DISC)
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS disc_profile TEXT,
ADD COLUMN IF NOT EXISTS disc_score_d NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS disc_score_i NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS disc_score_s NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS disc_score_c NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS disc_analysis JSONB;

-- Insights de vendas (OCULTOS - só para closers)
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS personality_summary TEXT,
ADD COLUMN IF NOT EXISTS sales_approach JSONB,
ADD COLUMN IF NOT EXISTS decision_triggers JSONB,
ADD COLUMN IF NOT EXISTS predicted_objections JSONB,
ADD COLUMN IF NOT EXISTS closing_strategies JSONB,
ADD COLUMN IF NOT EXISTS things_to_avoid TEXT[],
ADD COLUMN IF NOT EXISTS quick_tips TEXT[];

-- Respostas abertas do formulário
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS challenge_answer TEXT,
ADD COLUMN IF NOT EXISTS desired_change_answer TEXT,
ADD COLUMN IF NOT EXISTS form_completed_at TIMESTAMP WITH TIME ZONE;

-- Índice para buscar participantes com formulário completo
CREATE INDEX IF NOT EXISTS idx_participants_form_completed
ON public.participants(form_completed_at)
WHERE form_completed_at IS NOT NULL;

COMMENT ON COLUMN public.participants.primary_archetype IS 'Arquétipo principal - visível para participante';
COMMENT ON COLUMN public.participants.secondary_archetype IS 'Arquétipo secundário - visível para participante';
COMMENT ON COLUMN public.participants.disc_profile IS 'Perfil DISC (ex: DI, SC) - OCULTO, só para closers';
COMMENT ON COLUMN public.participants.predicted_objections IS 'Objeções previstas com scripts - OCULTO, só para closers';
