-- =============================================
-- SCRIPT V3: Versão final com todas as colunas NOT NULL
-- =============================================

-- 1. Adicionar colunas faltantes na tabela events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS nome_evento TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT,
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
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Criar índice único para slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);

-- 3. Criar tabela user_events
CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'closer',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, event_id)
);

-- 4. Criar tabela funis_origem
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

-- 5. Adicionar colunas em participants
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS chamado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chamado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS chamado_by UUID,
ADD COLUMN IF NOT EXISTS times_called INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS funil_origem_id UUID;

-- 6. Adicionar colunas em sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS closer_nome TEXT,
ADD COLUMN IF NOT EXISTS valor_proxima_semana DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dia_evento INTEGER,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS motivo_remocao TEXT;

-- 7. Criar índices
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_user_events_user ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON public.user_events(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_event ON public.participants(event_id);
CREATE INDEX IF NOT EXISTS idx_sales_event ON public.sales(event_id);

-- 8. Inserir o evento (com TODAS as colunas NOT NULL: name, start_date)
INSERT INTO public.events (
    name,
    start_date,
    nome_evento,
    slug,
    data_inicio,
    data_fim,
    local,
    cidade,
    estado,
    descricao,
    status
)
VALUES (
    'Intensivo da Alta Performance - Janeiro/26',
    '2026-01-15',
    'Intensivo da Alta Performance - Janeiro/26',
    'intensivo-alta-performance-jan-26',
    '2026-01-15',
    '2026-01-17',
    'Centro de Convenções Bethel',
    'São Paulo',
    'SP',
    'Primeiro evento do sistema Bethel Events',
    'ativo'
)
ON CONFLICT (slug) DO NOTHING;

-- 9. Migrar dados
DO $$
DECLARE
    default_event_id UUID;
BEGIN
    SELECT id INTO default_event_id
    FROM public.events
    WHERE slug = 'intensivo-alta-performance-jan-26'
    LIMIT 1;

    IF default_event_id IS NOT NULL THEN
        UPDATE public.participants
        SET event_id = default_event_id
        WHERE event_id IS NULL;

        UPDATE public.sales
        SET event_id = default_event_id
        WHERE event_id IS NULL;

        INSERT INTO public.user_events (user_id, event_id, role)
        SELECT id, default_event_id, COALESCE(role, 'closer')
        FROM public.users
        ON CONFLICT (user_id, event_id) DO NOTHING;

        RAISE NOTICE 'Evento configurado: %', default_event_id;
    END IF;
END $$;

-- 10. Verificar
SELECT 'Eventos' as tabela, COUNT(*) as total FROM events
UNION ALL
SELECT 'Participantes migrados', COUNT(*) FROM participants WHERE event_id IS NOT NULL
UNION ALL
SELECT 'Usuários com acesso', COUNT(*) FROM user_events;
