-- Add form_data column to store Q&A from webhook
ALTER TABLE participants ADD COLUMN IF NOT EXISTS form_data JSONB;

-- Add additional fields from new webhook format
ALTER TABLE participants ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS registration_status TEXT;

-- Create index for qr_code lookups
CREATE INDEX IF NOT EXISTS idx_participants_qr_code ON participants(qr_code);
