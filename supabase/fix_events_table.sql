-- =============================================
-- FIX: Adicionar colunas faltantes na tabela events
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- Adicionar colunas que podem estar faltando
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#E8A838',
ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#1A1A2E',
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT,
ADD COLUMN IF NOT EXISTS local TEXT,
ADD COLUMN IF NOT EXISTS data_inicio DATE,
ADD COLUMN IF NOT EXISTS data_fim DATE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Criar tabela user_events se não existir
CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'closer',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, event_id)
);

-- Criar tabela funis_origem se não existir
CREATE TABLE IF NOT EXISTS public.funis_origem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, slug)
);

-- Adicionar event_id em participants se não existir
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS chamado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chamado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS chamado_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS times_called INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS funil_origem_id UUID REFERENCES public.funis_origem(id);

-- Adicionar colunas em sales se não existir
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS closer_nome TEXT,
ADD COLUMN IF NOT EXISTS valor_proxima_semana DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dia_evento INTEGER,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS motivo_remocao TEXT;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_user_events_user ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON public.user_events(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_event ON public.participants(event_id);
CREATE INDEX IF NOT EXISTS idx_sales_event ON public.sales(event_id);

-- Verificar estrutura
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;
