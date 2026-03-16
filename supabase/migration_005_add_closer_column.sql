-- Migration: Adicionar coluna closer à tabela participants
-- Data: 2026-03-16

-- Adiciona coluna closer para armazenar o vendedor/consultor responsável
ALTER TABLE participants ADD COLUMN IF NOT EXISTS closer TEXT;

-- Criar índice para buscas por closer
CREATE INDEX IF NOT EXISTS idx_participants_closer ON participants(closer);
