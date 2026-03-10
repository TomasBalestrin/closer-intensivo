-- Migration: Add new participant fields from webhook form_data
-- Created: 2026-03-10

-- Add new fields to participants table
ALTER TABLE participants ADD COLUMN IF NOT EXISTS tem_acompanhante boolean DEFAULT false;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS relacao_acompanhante text;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS qr_code text;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS category text;

-- Comments for documentation
COMMENT ON COLUMN participants.tem_acompanhante IS 'Se o participante vai com acompanhante';
COMMENT ON COLUMN participants.relacao_acompanhante IS 'Relação com o acompanhante (esposa, sócio, etc)';
COMMENT ON COLUMN participants.qr_code IS 'Código QR para credenciamento';
COMMENT ON COLUMN participants.status IS 'Status do participante (confirmed, pending, etc)';
COMMENT ON COLUMN participants.category IS 'Categoria do ingresso (Standard, VIP, etc)';

