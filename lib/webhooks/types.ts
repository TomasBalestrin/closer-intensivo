export type WebhookTipo = 'inbound' | 'outbound'
export type WebhookCategoria = 'participantes' | 'credenciamentos' | 'vendas' | 'custom'
export type WebhookAuthType = 'none' | 'bearer' | 'basic' | 'api_key' | 'custom_header'
export type WebhookLogStatus = 'success' | 'error' | 'timeout' | 'retry'
export type WebhookQueueStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Webhook {
  id: string
  created_at: string
  updated_at: string
  nome: string
  descricao: string | null
  tipo: WebhookTipo
  categoria: WebhookCategoria | null
  token: string | null
  secret_key: string | null
  url: string | null
  metodo: string
  eventos: string[]
  auth_type: WebhookAuthType
  auth_value_encrypted: string | null
  custom_headers: Record<string, string>
  retry_attempts: number
  retry_delay_seconds: number
  timeout_seconds: number
  filtros: WebhookFiltro[]
  ativo: boolean
  total_requisicoes: number
  total_sucesso: number
  total_falha: number
  ultima_execucao: string | null
  ultimo_status: string | null
}

export interface WebhookLog {
  id: string
  created_at: string
  webhook_id: string | null
  direcao: 'inbound' | 'outbound'
  evento: string | null
  url: string | null
  metodo: string | null
  request_headers: Record<string, string> | null
  request_body: any
  response_status: number | null
  response_headers: Record<string, string> | null
  response_body: string | null
  duracao_ms: number | null
  tentativa: number
  status: WebhookLogStatus
  erro_mensagem: string | null
  entidade_tipo: string | null
  entidade_id: string | null
  ip_origem: string | null
}

export interface WebhookQueueItem {
  id: string
  created_at: string
  webhook_id: string
  evento: string
  payload: any
  status: WebhookQueueStatus
  tentativas: number
  max_tentativas: number
  proxima_tentativa: string
  ultimo_erro: string | null
  processado_at: string | null
}

export interface WebhookFiltro {
  campo: string
  operador: 'equals' | 'contains' | 'greater_than' | 'less_than'
  valor: any
}

export interface WebhookEvent {
  evento: string
  dados: any
  entidade_tipo: string
  entidade_id: string
}

// All available outbound events
export const WEBHOOK_EVENTS = [
  { value: 'participante.created', label: 'Participante Criado', group: 'Participantes' },
  { value: 'participante.updated', label: 'Participante Atualizado', group: 'Participantes' },
  { value: 'venda.created', label: 'Venda Registrada', group: 'Vendas' },
  { value: 'venda.updated', label: 'Venda Atualizada', group: 'Vendas' },
  { value: 'credenciamento.checkin', label: 'Check-in Realizado', group: 'Credenciamento' },
  { value: 'credenciamento.checkout', label: 'Check-out Realizado', group: 'Credenciamento' },
  { value: 'formulario_disc.completed', label: 'Formulário DISC Respondido', group: 'Formulários' },
  { value: 'qualificacao.changed', label: 'Qualificação Alterada', group: 'Qualificação' },
] as const

export const WEBHOOK_CATEGORIAS: { value: WebhookCategoria; label: string }[] = [
  { value: 'participantes', label: 'Participantes' },
  { value: 'credenciamentos', label: 'Credenciamentos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'custom', label: 'Customizado' },
]

export const AUTH_TYPES: { value: WebhookAuthType; label: string }[] = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api_key', label: 'API Key' },
  { value: 'custom_header', label: 'Header Customizado' },
]
