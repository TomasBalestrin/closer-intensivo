-- =============================================
-- MIGRAÇÃO 004: Arquitetura Multi-Evento
-- Execute este script no SQL Editor do Supabase
--
-- IMPORTANTE: Faça backup do banco antes de executar!
-- Este script é idempotente (pode ser executado múltiplas vezes)
-- =============================================

-- =============================================
-- PARTE 1: Criar tipo ENUM para status de evento
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        CREATE TYPE event_status AS ENUM ('ativo', 'arquivado', 'rascunho');
    END IF;
END $$;

-- =============================================
-- PARTE 2: Criar tipo ENUM para role (incluindo financeiro)
-- =============================================

-- Primeiro, verificar se precisa adicionar 'financeiro' ao tipo user_role
-- Se user_role já existe como ENUM, precisamos alterá-lo
DO $$
BEGIN
    -- Tentar adicionar 'financeiro' ao enum existente
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'financeiro';
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- Já existe, ignorar
        END;
    END IF;
END $$;

-- =============================================
-- PARTE 3: Tabela EVENTS (Eventos)
-- =============================================

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_evento TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    numero_dias INTEGER GENERATED ALWAYS AS (data_fim - data_inicio + 1) STORED,
    local TEXT NOT NULL,
    cidade TEXT,
    estado TEXT,
    descricao TEXT,
    capacidade_maxima INTEGER,
    logo_url TEXT,
    cor_primaria TEXT DEFAULT '#E8A838',
    cor_secundaria TEXT DEFAULT '#1A1A2E',
    status event_status NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para events
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_data_inicio ON public.events(data_inicio);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at();

COMMENT ON TABLE public.events IS 'Tabela de eventos do sistema multi-evento';

-- =============================================
-- PARTE 4: Tabela USER_EVENTS (Permissões por evento)
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'closer' CHECK (role IN ('admin', 'closer', 'financeiro')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_events_user ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON public.user_events(event_id);

COMMENT ON TABLE public.user_events IS 'Permissões de usuário por evento';

-- =============================================
-- PARTE 5: Tabela FUNIS_ORIGEM (Funis de origem)
-- =============================================

CREATE TABLE IF NOT EXISTS public.funis_origem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_funis_origem_event ON public.funis_origem(event_id);
CREATE INDEX IF NOT EXISTS idx_funis_origem_ativo ON public.funis_origem(event_id, ativo);

COMMENT ON TABLE public.funis_origem IS 'Funis de origem dos participantes por evento';

-- =============================================
-- PARTE 6: Tabela AUDIT_LOG (Auditoria)
-- =============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    acao TEXT NOT NULL,
    tabela_afetada TEXT NOT NULL,
    registro_id UUID NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event ON public.audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro ON public.audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_acao ON public.audit_log(acao);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

COMMENT ON TABLE public.audit_log IS 'Log de auditoria para edições e remoções';

-- =============================================
-- PARTE 7: Alterar tabela PARTICIPANTS
-- =============================================

-- Adicionar event_id (nullable primeiro para migração)
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- Adicionar funil_origem_id
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS funil_origem_id UUID REFERENCES public.funis_origem(id) ON DELETE SET NULL;

-- Adicionar campos de "chamado"
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS chamado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chamado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS chamado_by UUID REFERENCES auth.users(id);

-- Índices para participants
CREATE INDEX IF NOT EXISTS idx_participants_event ON public.participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_event_chamado ON public.participants(event_id, chamado);
CREATE INDEX IF NOT EXISTS idx_participants_event_funil ON public.participants(event_id, funil_origem_id);
CREATE INDEX IF NOT EXISTS idx_participants_event_disc ON public.participants(event_id) WHERE disc_profile IS NOT NULL;

COMMENT ON COLUMN public.participants.event_id IS 'Evento ao qual o participante pertence';
COMMENT ON COLUMN public.participants.chamado IS 'Se o participante foi chamado para atendimento';
COMMENT ON COLUMN public.participants.chamado_at IS 'Quando foi marcado como chamado';
COMMENT ON COLUMN public.participants.chamado_by IS 'Quem marcou como chamado';

-- =============================================
-- PARTE 8: Alterar tabela SALES
-- =============================================

-- Adicionar event_id (nullable primeiro para migração)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- Adicionar novos campos de venda
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS closer_nome TEXT,
ADD COLUMN IF NOT EXISTS valor_proxima_semana DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dia_evento INTEGER,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Campos para soft-delete
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS motivo_remocao TEXT;

-- Índices para sales
CREATE INDEX IF NOT EXISTS idx_sales_event ON public.sales(event_id);
CREATE INDEX IF NOT EXISTS idx_sales_event_active ON public.sales(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_deleted ON public.sales(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.sales.event_id IS 'Evento ao qual a venda pertence';
COMMENT ON COLUMN public.sales.closer_nome IS 'Nome do closer que realizou a venda';
COMMENT ON COLUMN public.sales.valor_proxima_semana IS 'Valor a receber na próxima semana';
COMMENT ON COLUMN public.sales.deleted_at IS 'Soft-delete timestamp';

-- =============================================
-- PARTE 9: Alterar tabela FORMS
-- =============================================

ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_forms_event ON public.forms(event_id);

-- =============================================
-- PARTE 10: Alterar tabela WEBHOOKS_LOG
-- =============================================

ALTER TABLE public.webhooks_log
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_webhooks_log_event ON public.webhooks_log(event_id);

-- =============================================
-- PARTE 11: Criar evento padrão e migrar dados
-- =============================================

-- Inserir o evento padrão (se não existir)
INSERT INTO public.events (
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
SELECT
    'Intensivo da Alta Performance - Janeiro/26',
    'intensivo-alta-performance-jan-26',
    '2026-01-15',
    '2026-01-17',
    'Centro de Convenções Bethel',
    'São Paulo',
    'SP',
    'Primeiro evento do sistema Bethel Events',
    'ativo'
WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE slug = 'intensivo-alta-performance-jan-26'
);

-- Pegar o ID do evento padrão
DO $$
DECLARE
    default_event_id UUID;
BEGIN
    SELECT id INTO default_event_id FROM public.events WHERE slug = 'intensivo-alta-performance-jan-26' LIMIT 1;

    -- Migrar participantes sem event_id para o evento padrão
    UPDATE public.participants
    SET event_id = default_event_id
    WHERE event_id IS NULL;

    -- Migrar vendas sem event_id para o evento padrão
    UPDATE public.sales
    SET event_id = default_event_id
    WHERE event_id IS NULL;

    -- Migrar forms sem event_id para o evento padrão
    UPDATE public.forms
    SET event_id = default_event_id
    WHERE event_id IS NULL;

    -- Migrar webhooks_log sem event_id para o evento padrão
    UPDATE public.webhooks_log
    SET event_id = default_event_id
    WHERE event_id IS NULL;

    -- Dar acesso a todos os admins existentes ao evento padrão
    INSERT INTO public.user_events (user_id, event_id, role)
    SELECT u.id, default_event_id, u.role::text
    FROM public.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_events ue
        WHERE ue.user_id = u.id AND ue.event_id = default_event_id
    );

    -- Inserir os 12 funis de origem para o evento padrão
    INSERT INTO public.funis_origem (event_id, nome, slug, ordem)
    VALUES
        (default_event_id, 'Indicação Closer Base', 'indicacao-closer-base', 1),
        (default_event_id, 'Indicação CS Base', 'indicacao-cs-base', 2),
        (default_event_id, 'Indicação Elite Premium', 'indicacao-elite-premium', 3),
        (default_event_id, 'Convidado Cleiton', 'convidado-cleiton', 4),
        (default_event_id, 'Convidado Júlia', 'convidado-julia', 5),
        (default_event_id, 'Mentorada Júlia', 'mentorada-julia', 6),
        (default_event_id, 'Implementação Comercial', 'implementacao-comercial', 7),
        (default_event_id, 'Implementação IA Bethel', 'implementacao-ia-bethel', 8),
        (default_event_id, 'Implementação IA Next', 'implementacao-ia-next', 9),
        (default_event_id, 'Bethel Club', 'bethel-club', 10),
        (default_event_id, 'Elite Premium', 'elite-premium', 11),
        (default_event_id, 'Aluna Base', 'aluna-base', 12)
    ON CONFLICT (event_id, slug) DO NOTHING;
END $$;

-- =============================================
-- PARTE 12: Tornar event_id NOT NULL após migração
-- =============================================

-- Verificar se há registros sem event_id antes de alterar para NOT NULL
DO $$
DECLARE
    orphan_participants INTEGER;
    orphan_sales INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_participants FROM public.participants WHERE event_id IS NULL;
    SELECT COUNT(*) INTO orphan_sales FROM public.sales WHERE event_id IS NULL;

    IF orphan_participants > 0 THEN
        RAISE NOTICE 'AVISO: % participantes sem event_id', orphan_participants;
    END IF;

    IF orphan_sales > 0 THEN
        RAISE NOTICE 'AVISO: % vendas sem event_id', orphan_sales;
    END IF;
END $$;

-- Comentado: executar manualmente após verificar que não há órfãos
-- ALTER TABLE public.participants ALTER COLUMN event_id SET NOT NULL;
-- ALTER TABLE public.sales ALTER COLUMN event_id SET NOT NULL;

-- =============================================
-- PARTE 13: RLS Policies para EVENTS
-- =============================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os eventos
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Admins can view all events" ON public.events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Usuários podem ver eventos aos quais têm acesso
DROP POLICY IF EXISTS "Users can view their events" ON public.events;
CREATE POLICY "Users can view their events" ON public.events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_events ue
            WHERE ue.event_id = events.id AND ue.user_id = auth.uid()
        )
    );

-- Apenas admins podem criar eventos
DROP POLICY IF EXISTS "Admins can create events" ON public.events;
CREATE POLICY "Admins can create events" ON public.events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Apenas admins podem editar eventos
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update events" ON public.events
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- =============================================
-- PARTE 14: RLS Policies para USER_EVENTS
-- =============================================

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias permissões
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_events;
CREATE POLICY "Users can view own permissions" ON public.user_events
    FOR SELECT
    USING (user_id = auth.uid());

-- Admins podem ver todas as permissões
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_events;
CREATE POLICY "Admins can view all permissions" ON public.user_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Apenas admins podem gerenciar permissões
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_events;
CREATE POLICY "Admins can manage permissions" ON public.user_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- =============================================
-- PARTE 15: RLS Policies para FUNIS_ORIGEM
-- =============================================

ALTER TABLE public.funis_origem ENABLE ROW LEVEL SECURITY;

-- Todos com acesso ao evento podem ver os funis
DROP POLICY IF EXISTS "Users can view event funnels" ON public.funis_origem;
CREATE POLICY "Users can view event funnels" ON public.funis_origem
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_events ue
            WHERE ue.event_id = funis_origem.event_id AND ue.user_id = auth.uid()
        )
    );

-- Apenas admins podem gerenciar funis
DROP POLICY IF EXISTS "Admins can manage funnels" ON public.funis_origem;
CREATE POLICY "Admins can manage funnels" ON public.funis_origem
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- =============================================
-- PARTE 16: RLS Policies para AUDIT_LOG
-- =============================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins e financeiros podem ver audit_log
DROP POLICY IF EXISTS "Admins and financeiros can view audit" ON public.audit_log;
CREATE POLICY "Admins and financeiros can view audit" ON public.audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'financeiro')
        )
    );

-- Sistema pode inserir (via triggers)
DROP POLICY IF EXISTS "System can insert audit" ON public.audit_log;
CREATE POLICY "System can insert audit" ON public.audit_log
    FOR INSERT
    WITH CHECK (true);

-- =============================================
-- PARTE 17: Função para criar audit log automaticamente
-- =============================================

CREATE OR REPLACE FUNCTION create_audit_log(
    p_event_id UUID,
    p_user_id UUID,
    p_acao TEXT,
    p_tabela TEXT,
    p_registro_id UUID,
    p_dados_anteriores JSONB DEFAULT NULL,
    p_dados_novos JSONB DEFAULT NULL,
    p_motivo TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO public.audit_log (
        event_id, user_id, acao, tabela_afetada,
        registro_id, dados_anteriores, dados_novos, motivo
    )
    VALUES (
        p_event_id, p_user_id, p_acao, p_tabela,
        p_registro_id, p_dados_anteriores, p_dados_novos, p_motivo
    )
    RETURNING id INTO audit_id;

    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 18: Função para "chamar" participante
-- =============================================

CREATE OR REPLACE FUNCTION marcar_como_chamado(
    p_participant_id UUID,
    p_user_id UUID,
    p_chamado BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.participants
    SET
        chamado = p_chamado,
        chamado_at = CASE WHEN p_chamado THEN now() ELSE NULL END,
        chamado_by = CASE WHEN p_chamado THEN p_user_id ELSE NULL END
    WHERE id = p_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 19: Função para soft-delete de venda
-- =============================================

CREATE OR REPLACE FUNCTION soft_delete_sale(
    p_sale_id UUID,
    p_user_id UUID,
    p_motivo TEXT
)
RETURNS VOID AS $$
DECLARE
    v_event_id UUID;
    v_dados_anteriores JSONB;
BEGIN
    -- Capturar dados antes da remoção
    SELECT event_id, to_jsonb(s.*) INTO v_event_id, v_dados_anteriores
    FROM public.sales s
    WHERE id = p_sale_id;

    -- Marcar como deletado
    UPDATE public.sales
    SET
        deleted_at = now(),
        deleted_by = p_user_id,
        motivo_remocao = p_motivo
    WHERE id = p_sale_id;

    -- Criar audit log
    PERFORM create_audit_log(
        v_event_id,
        p_user_id,
        'delete_venda',
        'sales',
        p_sale_id,
        v_dados_anteriores,
        NULL,
        p_motivo
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 20: View para vendas ativas (excluindo soft-deleted)
-- =============================================

CREATE OR REPLACE VIEW public.sales_ativas AS
SELECT * FROM public.sales
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.sales_ativas IS 'View de vendas ativas (exclui soft-deleted)';

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================

DO $$
DECLARE
    events_count INTEGER;
    funis_count INTEGER;
    participants_with_event INTEGER;
    sales_with_event INTEGER;
BEGIN
    SELECT COUNT(*) INTO events_count FROM public.events;
    SELECT COUNT(*) INTO funis_count FROM public.funis_origem;
    SELECT COUNT(*) INTO participants_with_event FROM public.participants WHERE event_id IS NOT NULL;
    SELECT COUNT(*) INTO sales_with_event FROM public.sales WHERE event_id IS NOT NULL;

    RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA ===';
    RAISE NOTICE 'Eventos criados: %', events_count;
    RAISE NOTICE 'Funis de origem: %', funis_count;
    RAISE NOTICE 'Participantes com event_id: %', participants_with_event;
    RAISE NOTICE 'Vendas com event_id: %', sales_with_event;
    RAISE NOTICE '========================';
END $$;
