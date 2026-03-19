-- Migration: Adicionar coluna assigned_closer_id à tabela participants
-- Data: 2026-03-19
-- Descrição: Adiciona a coluna assigned_closer_id que referencia a tabela users
-- para associar um closer responsável a cada participante

-- Adiciona coluna assigned_closer_id como UUID referenciando users
ALTER TABLE participants ADD COLUMN IF NOT EXISTS assigned_closer_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Criar índice para buscas por assigned_closer_id (melhora performance de queries)
CREATE INDEX IF NOT EXISTS idx_participants_assigned_closer ON participants(assigned_closer_id);

-- Atualiza o cache do schema (forçar refresh)
-- Nota: Após executar esta migration, pode ser necessário fazer um refresh no schema cache
-- do Supabase Dashboard ou reiniciar a conexão do cliente
