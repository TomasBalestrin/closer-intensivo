-- Migration: Complete Webhook System
-- Date: 2026-01-29

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: webhooks (Configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identification
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('inbound', 'outbound')),
  categoria VARCHAR(50), -- 'participantes', 'credenciamentos', 'vendas', 'custom'

  -- Security (Inbound)
  token VARCHAR(255) UNIQUE,
  secret_key VARCHAR(255),

  -- Configuration (Outbound)
  url VARCHAR(500),
  metodo VARCHAR(10) DEFAULT 'POST',
  eventos TEXT[] DEFAULT '{}',

  -- Authentication
  auth_type VARCHAR(20) DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'basic', 'api_key', 'custom_header')),
  auth_value_encrypted TEXT,
  custom_headers JSONB DEFAULT '{}',

  -- Retry Configuration
  retry_attempts INT DEFAULT 3,
  retry_delay_seconds INT DEFAULT 30,
  timeout_seconds INT DEFAULT 30,

  -- Filters
  filtros JSONB DEFAULT '[]',

  -- Status
  ativo BOOLEAN DEFAULT true,

  -- Statistics (cached)
  total_requisicoes INT DEFAULT 0,
  total_sucesso INT DEFAULT 0,
  total_falha INT DEFAULT 0,
  ultima_execucao TIMESTAMPTZ,
  ultimo_status VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tipo ON webhooks(tipo);
CREATE INDEX IF NOT EXISTS idx_webhooks_ativo ON webhooks(ativo);
CREATE INDEX IF NOT EXISTS idx_webhooks_token ON webhooks(token);
CREATE INDEX IF NOT EXISTS idx_webhooks_categoria ON webhooks(categoria);

-- ============================================
-- Table: webhook_logs (Detailed Logs)
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,

  -- Request Details
  direcao VARCHAR(10) NOT NULL CHECK (direcao IN ('inbound', 'outbound')),
  evento VARCHAR(100),
  url VARCHAR(500),
  metodo VARCHAR(10),

  -- Payload
  request_headers JSONB,
  request_body JSONB,

  -- Response
  response_status INT,
  response_headers JSONB,
  response_body TEXT,

  -- Metrics
  duracao_ms INT,
  tentativa INT DEFAULT 1,

  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'retry')),
  erro_mensagem TEXT,

  -- References
  entidade_tipo VARCHAR(50),
  entidade_id UUID,

  -- IP (for inbound)
  ip_origem VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_direcao ON webhook_logs(direcao);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_evento ON webhook_logs(evento);

-- ============================================
-- Table: webhook_queue (Outbound Queue)
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  evento VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,

  -- Processing Control
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tentativas INT DEFAULT 0,
  max_tentativas INT DEFAULT 3,
  proxima_tentativa TIMESTAMPTZ DEFAULT NOW(),

  -- Result
  ultimo_erro TEXT,
  processado_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON webhook_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_proxima_tentativa ON webhook_queue(proxima_tentativa);

-- ============================================
-- RPC Functions for atomic stat updates
-- ============================================
CREATE OR REPLACE FUNCTION incrementar_webhook_sucesso(p_webhook_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE webhooks
  SET total_requisicoes = total_requisicoes + 1,
      total_sucesso = total_sucesso + 1,
      ultima_execucao = NOW(),
      ultimo_status = 'success',
      updated_at = NOW()
  WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION incrementar_webhook_falha(p_webhook_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE webhooks
  SET total_requisicoes = total_requisicoes + 1,
      total_falha = total_falha + 1,
      ultima_execucao = NOW(),
      ultimo_status = 'error',
      updated_at = NOW()
  WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Disable RLS for service role access
-- ============================================
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on webhooks" ON webhooks FOR ALL USING (true);
CREATE POLICY "Service role full access on webhook_logs" ON webhook_logs FOR ALL USING (true);
CREATE POLICY "Service role full access on webhook_queue" ON webhook_queue FOR ALL USING (true);
