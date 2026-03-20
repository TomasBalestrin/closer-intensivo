'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  Badge,
  Button,
  Select,
  useToast,
} from '@/components/ui'
import {
  Copy,
  Check,
  Webhook,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
} from 'lucide-react'

interface EventOption {
  id: string
  nome_evento: string
}

interface WebhookLog {
  id: string
  created_at: string
  direcao: 'inbound' | 'outbound'
  evento: string
  url: string
  metodo: string
  request_headers: Record<string, any>
  request_body: any
  response_status: number | null
  response_body: string | null
  duracao_ms: number | null
  status: 'success' | 'error' | 'timeout' | 'retry'
  erro_mensagem: string | null
  entidade_tipo: string | null
  entidade_id: string | null
  ip_origem: string | null
}

export default function WebhooksPage() {
  const supabase = createClient()
  const { showToast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showDocs, setShowDocs] = useState(false)
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  // Tab state
  const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config')

  // Reprocess state
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessResult, setReprocessResult] = useState<any>(null)

  // Logs state
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, nome_evento')
        .order('data_inicio', { ascending: false })
      setEvents(data || [])
    }
    fetchEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch logs when tab changes to logs
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      // Buscar de ambas as tabelas
      const [newLogsResult, oldLogsResult] = await Promise.all([
        supabase
          .from('webhook_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('webhooks_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
      ])

      const newLogs: WebhookLog[] = newLogsResult.data || []

      // Converter formato antigo para novo
      const oldLogs: WebhookLog[] = (oldLogsResult.data || []).map((log: any) => ({
        id: log.id,
        created_at: log.created_at,
        direcao: 'inbound' as const,
        evento: 'participantes.webhook',
        url: '-',
        metodo: 'POST',
        request_headers: {},
        request_body: log.payload,
        response_status: log.processed ? 200 : null,
        response_body: null,
        duracao_ms: null,
        status: log.processed ? 'success' : 'error' as const,
        erro_mensagem: null,
        entidade_tipo: 'participante',
        entidade_id: null,
        ip_origem: null,
      }))

      // Combinar e ordenar por data
      const allLogs = [...newLogs, ...oldLogs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 200)

      setLogs(allLogs)
    } catch (err) {
      console.error('Erro ao buscar logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const getWebhookUrl = (eventId: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/api/webhooks/evento/${eventId}`
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      showToast('Copiado!', 'success')
    } catch {
      showToast('Erro ao copiar', 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'timeout':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Sucesso</Badge>
      case 'error':
        return <Badge variant="danger">Erro</Badge>
      case 'timeout':
        return <Badge variant="warning">Timeout</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const handleReprocess = async (dryRun: boolean) => {
    setReprocessing(true)
    setReprocessResult(null)
    try {
      const params = new URLSearchParams()
      if (dryRun) params.set('dry_run', 'true')
      if (selectedEventId) params.set('event_id', selectedEventId)

      const res = await fetch(`/api/admin/reprocess-participants?${params.toString()}`, {
        method: 'POST',
      })
      const data = await res.json()
      setReprocessResult(data)

      if (data.success) {
        showToast(
          dryRun
            ? `Simulação: ${data.results?.updated || 0} participantes seriam atualizados`
            : `${data.results?.updated || 0} participantes atualizados com sucesso`,
          'success'
        )
      } else {
        showToast(data.error || 'Erro ao reprocessar', 'error')
      }
    } catch (err: any) {
      showToast('Erro de conexão ao reprocessar', 'error')
    } finally {
      setReprocessing(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const examplePayload = {
    participant: {
      id: 'b04ec1f6-54d5-4d59-bb22-9818d4231b5d',
      name: 'João Silva',
      email: 'joao@email.com',
      setor: 'Standard',
      oportunidade: 'Sim',
      funnel_origin: 'Indicação',
      form_data: {
        'Digite seu CPF': '123.456.789-00',
        'Qual o telefone?': '(11) 99999-9999',
        'Nome para crachá': 'João',
        'Qual a sua área de atuação?': 'Marketing Digital',
        'Qual o seu faturamento mensal?': 'R$ 20.000,00 até R$ 50.000,00',
        'Adicione uma foto sua para perfil.': 'https://exemplo.com/foto.jpg',
        'Qual a maior dificuldade no seu negócio?': 'Escalar vendas',
        'O que você pretende aprender no Intensivo?': 'Técnicas de fechamento',
      },
    },
    checkin_days: {
      day_1: 'checked_in',
      day_2: 'pending',
      day_3: 'pending',
    },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="text-gray-600">Endpoint para receber dados externos via webhook</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configuração
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Logs Recebidos
          </button>
        </nav>
      </div>

      {/* Config Tab */}
      {activeTab === 'config' && (
        <>
          {/* Event Selector */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Selecione o Evento</h3>
                  <p className="text-xs text-gray-500">
                    Cada evento tem sua própria URL de webhook. Selecione o evento para ver o endpoint correspondente.
                  </p>
                </div>
                <Select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  options={[
                    { value: '', label: 'Selecione um evento...' },
                    ...events.map(e => ({ value: e.id, label: e.nome_evento })),
                  ]}
                  className="w-full sm:w-72"
                />
              </div>

              {!selectedEventId && (
                <div className="mt-3 flex items-center gap-2 text-amber-700 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Selecione um evento para ver a URL do webhook.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook Endpoint - only show when event is selected */}
          {selectedEventId && (
            <Card>
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-500 text-white p-3 rounded-xl flex-shrink-0">
                    <Webhook className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{selectedEvent?.nome_evento}</h3>
                      <Badge variant="success">Ativo</Badge>
                      <Badge variant="info">POST</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      Webhook exclusivo deste evento. O evento é identificado automaticamente pela URL, sem necessidade de enviar ID no payload.
                    </p>

                    {/* URL */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 font-mono text-sm text-gray-700 truncate">
                        {getWebhookUrl(selectedEventId)}
                      </div>
                      <Button size="sm" onClick={() => handleCopy(getWebhookUrl(selectedEventId), 'url')} className="flex-shrink-0">
                        {copiedId === 'url' ? (
                          <><Check className="h-4 w-4 mr-1" /> Copiado</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Toggle docs */}
                <button
                  onClick={() => setShowDocs(!showDocs)}
                  className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showDocs ? (
                    <><ChevronUp className="h-4 w-4" /> Ocultar documentação</>
                  ) : (
                    <><ChevronDown className="h-4 w-4" /> Ver documentação</>
                  )}
                </button>

                {/* Documentation */}
                {showDocs && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Structure */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Estrutura do Payload:</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Campo</th>
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Tipo</th>
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Obrigatório</th>
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Descrição</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-50">
                              <td className="py-2 px-2 font-mono text-xs text-blue-700">participant.id</td>
                              <td className="py-2 px-2 text-gray-500">string</td>
                              <td className="py-2 px-2"><span className="text-gray-400">Não</span></td>
                              <td className="py-2 px-2 text-gray-600">ID externo (para deduplicação)</td>
                            </tr>
                            <tr className="border-b border-gray-50">
                              <td className="py-2 px-2 font-mono text-xs text-blue-700">participant.name</td>
                              <td className="py-2 px-2 text-gray-500">string</td>
                              <td className="py-2 px-2"><Badge variant="warning">*</Badge></td>
                              <td className="py-2 px-2 text-gray-600">Nome completo (*obrigatório se não tiver email)</td>
                            </tr>
                            <tr className="border-b border-gray-50">
                              <td className="py-2 px-2 font-mono text-xs text-blue-700">participant.email</td>
                              <td className="py-2 px-2 text-gray-500">string</td>
                              <td className="py-2 px-2"><Badge variant="warning">*</Badge></td>
                              <td className="py-2 px-2 text-gray-600">Email (*obrigatório se não tiver name)</td>
                            </tr>
                            <tr className="border-b border-gray-50">
                              <td className="py-2 px-2 font-mono text-xs text-blue-700">participant.oportunidade</td>
                              <td className="py-2 px-2 text-gray-500">string</td>
                              <td className="py-2 px-2"><span className="text-gray-400">Não</span></td>
                              <td className="py-2 px-2 text-gray-600">&quot;Acompanhante&quot; = não é oportunidade</td>
                            </tr>
                            <tr className="border-b border-gray-50">
                              <td className="py-2 px-2 font-mono text-xs text-blue-700">participant.funnel_origin</td>
                              <td className="py-2 px-2 text-gray-500">string</td>
                              <td className="py-2 px-2"><span className="text-gray-400">Não</span></td>
                              <td className="py-2 px-2 text-gray-600">Funil de origem</td>
                            </tr>
                            <tr className="border-b border-gray-50">
                              <td className="py-2 px-2 font-mono text-xs text-blue-700">participant.form_data</td>
                              <td className="py-2 px-2 text-gray-500">object</td>
                              <td className="py-2 px-2"><span className="text-gray-400">Não</span></td>
                              <td className="py-2 px-2 text-gray-600">Dados do formulário (CPF, telefone, etc.)</td>
                            </tr>
                            <tr className="border-b border-gray-50 bg-green-50">
                              <td className="py-2 px-2 font-mono text-xs text-green-700">checkin_days.day_1</td>
                              <td className="py-2 px-2 text-gray-500">string</td>
                              <td className="py-2 px-2"><span className="text-gray-400">Não</span></td>
                              <td className="py-2 px-2 text-gray-600">&quot;checked_in&quot; = presente, outro = ausente</td>
                            </tr>
                            <tr className="border-b border-gray-50 bg-green-50">
                              <td className="py-2 px-2 font-mono text-xs text-green-700">checkin_days.day_2</td>
                              <td className="py-2 px-2 text-gray-500">string</td>
                              <td className="py-2 px-2"><span className="text-gray-400">Não</span></td>
                              <td className="py-2 px-2 text-gray-600">&quot;checked_in&quot; = presente, outro = ausente</td>
                            </tr>
                            <tr className="border-b border-gray-50 bg-green-50">
                              <td className="py-2 px-2 font-mono text-xs text-green-700">checkin_days.day_3</td>
                              <td className="py-2 px-2 text-gray-500">string</td>
                              <td className="py-2 px-2"><span className="text-gray-400">Não</span></td>
                              <td className="py-2 px-2 text-gray-600">&quot;checked_in&quot; = presente, outro = ausente</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Form Data Fields */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Campos aceitos em form_data:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div><span className="font-mono text-blue-600">Digite seu CPF</span> → cpf</div>
                        <div><span className="font-mono text-blue-600">Qual o telefone?</span> → phone</div>
                        <div><span className="font-mono text-blue-600">Nome para crachá</span> → badge_name</div>
                        <div><span className="font-mono text-blue-600">Qual a sua área de atuação?</span> → niche</div>
                        <div><span className="font-mono text-blue-600">Qual o seu faturamento mensal?</span> → revenue</div>
                        <div><span className="font-mono text-blue-600">Adicione uma foto sua para perfil.</span> → photo_url</div>
                        <div><span className="font-mono text-blue-600">Qual a maior dificuldade...</span> → challenge_answer</div>
                        <div><span className="font-mono text-blue-600">O que pretende aprender...</span> → desired_change_answer</div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">* Os campos são detectados automaticamente mesmo com variações nos nomes.</p>
                    </div>

                    {/* Example payload */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">Exemplo de payload:</h4>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(JSON.stringify(examplePayload, null, 2), 'payload')}>
                          {copiedId === 'payload' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          Copiar
                        </Button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                        {JSON.stringify(examplePayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reprocess Participants */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="py-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Reprocessar Participantes</h3>
              <p className="text-xs text-gray-500 mb-3">
                Reextrai telefone, email, nome e outros campos do webhook_data salvo de cada participante.
                Útil quando a lógica de extração foi corrigida e você precisa atualizar os dados existentes.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleReprocess(true)}
                  disabled={reprocessing}
                >
                  {reprocessing ? (
                    <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Processando...</>
                  ) : (
                    <>Simular (Dry Run)</>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleReprocess(false)}
                  disabled={reprocessing}
                >
                  {reprocessing ? (
                    <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Processando...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-1" /> Reprocessar Agora</>
                  )}
                </Button>
              </div>

              {selectedEventId && (
                <p className="text-xs text-orange-600 mt-2">
                  Filtrando por evento: <strong>{selectedEvent?.nome_evento}</strong>
                </p>
              )}
              {!selectedEventId && (
                <p className="text-xs text-gray-400 mt-2">
                  Nenhum evento selecionado — vai reprocessar todos os participantes.
                </p>
              )}

              {reprocessResult && (
                <div className="mt-3 bg-white rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {reprocessResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">
                      {reprocessResult.dry_run ? 'Resultado da Simulação' : 'Resultado do Reprocessamento'}
                    </span>
                  </div>
                  {reprocessResult.results && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-gray-700">{reprocessResult.results.total}</div>
                        <div className="text-gray-500">Total</div>
                      </div>
                      <div className="bg-green-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-green-700">{reprocessResult.results.updated}</div>
                        <div className="text-gray-500">Atualizados</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-gray-500">{reprocessResult.results.skipped}</div>
                        <div className="text-gray-500">Ignorados</div>
                      </div>
                      <div className="bg-red-50 rounded p-2 text-center">
                        <div className="text-lg font-bold text-red-700">{reprocessResult.results.errors}</div>
                        <div className="text-gray-500">Erros</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info about deduplication */}
          <Card className="border-gray-200">
            <CardContent className="py-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Como funciona</h3>
              <p className="text-sm text-gray-600 mb-3">
                Cada evento possui sua própria URL de webhook. O evento é identificado automaticamente pela URL, sem necessidade de enviar IDs no payload.
              </p>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Deduplicação</h4>
              <p className="text-sm text-gray-600 mb-2">
                O sistema verifica se o participante já existe no evento usando a seguinte ordem:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li><strong>participant.id</strong> (external_id) - Identificador único do sistema externo</li>
                <li><strong>participant.email</strong> - Email do participante</li>
                <li><strong>form_data.cpf</strong> - CPF do participante</li>
                <li><strong>participant.name</strong> - Nome completo (último recurso)</li>
              </ol>
              <p className="text-sm text-gray-500 mt-3">
                Se encontrado, os dados são <strong>atualizados</strong>. Se não, um novo participante é <strong>criado</strong>.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Últimos 200 Webhooks Recebidos</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchLogs}
                disabled={loadingLogs}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingLogs ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            {loadingLogs ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Carregando logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum webhook recebido ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Data/Hora</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Evento</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">HTTP</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Duração</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">IP</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            {getStatusBadge(log.status)}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          <span className="font-mono text-xs">{log.evento || '-'}</span>
                        </td>
                        <td className="py-2 px-3">
                          {log.response_status ? (
                            <Badge variant={log.response_status < 400 ? 'success' : 'danger'}>
                              {log.response_status}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {log.duracao_ms ? `${log.duracao_ms}ms` : '-'}
                        </td>
                        <td className="py-2 px-3 text-gray-500 font-mono text-xs">
                          {log.ip_origem || '-'}
                        </td>
                        <td className="py-2 px-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLog(log)
                            }}
                          >
                            Ver JSON
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal for viewing JSON */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Detalhes do Webhook</h3>
                <p className="text-sm text-gray-500">{formatDate(selectedLog.created_at)}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedLog.status)}
                    {getStatusBadge(selectedLog.status)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">HTTP Status</span>
                  <div className="mt-1">
                    {selectedLog.response_status ? (
                      <Badge variant={selectedLog.response_status < 400 ? 'success' : 'danger'}>
                        {selectedLog.response_status}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Duração</span>
                  <p className="mt-1 font-medium">
                    {selectedLog.duracao_ms ? `${selectedLog.duracao_ms}ms` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">IP Origem</span>
                  <p className="mt-1 font-mono text-sm">
                    {selectedLog.ip_origem || '-'}
                  </p>
                </div>
              </div>

              {/* URL */}
              {selectedLog.url && selectedLog.url !== '-' && (
                <div>
                  <span className="text-xs text-gray-500">URL</span>
                  <p className="mt-1 font-mono text-sm text-gray-700 bg-gray-50 p-2 rounded break-all">
                    {selectedLog.url}
                  </p>
                </div>
              )}

              {/* Error */}
              {selectedLog.erro_mensagem && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-xs text-red-600 font-medium">Erro</span>
                  <p className="mt-1 text-sm text-red-700">{selectedLog.erro_mensagem}</p>
                </div>
              )}

              {/* Request Headers */}
              {selectedLog.request_headers && Object.keys(selectedLog.request_headers).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Request Headers</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(JSON.stringify(selectedLog.request_headers, null, 2), 'headers')}
                    >
                      {copiedId === 'headers' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copiar
                    </Button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs max-h-40">
                    {JSON.stringify(selectedLog.request_headers, null, 2)}
                  </pre>
                </div>
              )}

              {/* Request Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Request Body (JSON Recebido)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(JSON.stringify(selectedLog.request_body, null, 2), 'request')}
                  >
                    {copiedId === 'request' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    Copiar
                  </Button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs max-h-96">
                  {JSON.stringify(selectedLog.request_body, null, 2)}
                </pre>
              </div>

              {/* Response Body */}
              {selectedLog.response_body && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Response Body (Resposta Enviada)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(selectedLog.response_body || '', 'response')}
                    >
                      {copiedId === 'response' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copiar
                    </Button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs max-h-60">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.response_body), null, 2)
                      } catch {
                        return selectedLog.response_body
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <Button onClick={() => setSelectedLog(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
