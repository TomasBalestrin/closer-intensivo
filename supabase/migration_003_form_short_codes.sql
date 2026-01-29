-- =============================================
-- MIGRAÇÃO 003: Adiciona short_code para URLs curtas de formulários
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- Adiciona coluna short_code para URLs mais bonitas
ALTER TABLE public.disc_forms
ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- Gera short codes para formulários existentes que ainda não têm
UPDATE public.disc_forms
SET short_code = UPPER(SUBSTR(MD5(id::text), 1, 6))
WHERE short_code IS NULL;

-- Índice para busca rápida por short_code
CREATE INDEX IF NOT EXISTS idx_disc_forms_short_code
ON public.disc_forms(short_code)
WHERE short_code IS NOT NULL;
