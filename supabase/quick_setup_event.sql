-- =============================================
-- SCRIPT RÁPIDO: Criar Evento e Migrar Dados
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- 1. Criar o evento padrão
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
VALUES (
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

-- 2. Pegar o ID do evento criado
DO $$
DECLARE
    default_event_id UUID;
BEGIN
    SELECT id INTO default_event_id
    FROM public.events
    WHERE slug = 'intensivo-alta-performance-jan-26'
    LIMIT 1;

    IF default_event_id IS NULL THEN
        RAISE EXCEPTION 'Evento não foi criado';
    END IF;

    -- 3. Atualizar participantes sem event_id
    UPDATE public.participants
    SET event_id = default_event_id
    WHERE event_id IS NULL;

    -- 4. Atualizar vendas sem event_id (se coluna existir)
    BEGIN
        UPDATE public.sales
        SET event_id = default_event_id
        WHERE event_id IS NULL;
    EXCEPTION WHEN undefined_column THEN
        NULL; -- Coluna não existe, ignorar
    END;

    -- 5. Dar acesso a todos os usuários ao evento
    INSERT INTO public.user_events (user_id, event_id, role)
    SELECT id, default_event_id, role
    FROM public.users
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Evento criado com ID: %', default_event_id;
END $$;

-- 6. Verificar
SELECT
    e.nome_evento,
    e.status,
    (SELECT COUNT(*) FROM participants WHERE event_id = e.id) as participantes,
    (SELECT COUNT(*) FROM user_events WHERE event_id = e.id) as usuarios_com_acesso
FROM events e
WHERE e.slug = 'intensivo-alta-performance-jan-26';
