-- =============================================
-- MIGRAÇÃO: Adiciona colunas faltantes
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- Tabela participants: adiciona colunas de campos manuais
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS funnel TEXT,
ADD COLUMN IF NOT EXISTS seller_closer_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS mentee_inviter TEXT,
ADD COLUMN IF NOT EXISTS companion TEXT,
ADD COLUMN IF NOT EXISTS is_opportunity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS times_called INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS qualification TEXT,
ADD COLUMN IF NOT EXISTS webhook_data JSONB;

-- Tabela disc_forms: adiciona colunas para análise DISC detalhada
ALTER TABLE public.disc_forms
ADD COLUMN IF NOT EXISTS disc_profile TEXT,
ADD COLUMN IF NOT EXISTS disc_description TEXT,
ADD COLUMN IF NOT EXISTS sales_insights TEXT,
ADD COLUMN IF NOT EXISTS objections TEXT,
ADD COLUMN IF NOT EXISTS objection_handling TEXT,
ADD COLUMN IF NOT EXISTS closing_examples TEXT;

-- Tabela sales: adiciona colunas extras
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS product TEXT,
ADD COLUMN IF NOT EXISTS total_value NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS entry_value NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS negotiation_type TEXT;

-- Tabela webhooks_log: cria se não existir
CREATE TABLE IF NOT EXISTS public.webhooks_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS na tabela webhooks_log
ALTER TABLE public.webhooks_log ENABLE ROW LEVEL SECURITY;

-- Política para webhooks_log (apenas admins podem ver)
DROP POLICY IF EXISTS "Admins can view webhooks_log" ON public.webhooks_log;
CREATE POLICY "Admins can view webhooks_log"
    ON public.webhooks_log FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Permite inserção anônima para webhook
DROP POLICY IF EXISTS "Anyone can insert webhooks_log" ON public.webhooks_log;
CREATE POLICY "Anyone can insert webhooks_log"
    ON public.webhooks_log FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Atualiza políticas para permitir acesso anônimo aos disc_forms
DROP POLICY IF EXISTS "Anyone can update disc_forms" ON public.disc_forms;
CREATE POLICY "Anyone can update disc_forms"
    ON public.disc_forms FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Cria índice para performance
CREATE INDEX IF NOT EXISTS idx_participants_seller_closer_id ON public.participants(seller_closer_id);

COMMENT ON TABLE public.webhooks_log IS 'Log de webhooks recebidos para processamento';
