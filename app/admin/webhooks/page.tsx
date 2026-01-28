'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  Select,
  Modal,
  Loading,
  useToast,
} from '@/components/ui'
import {
  Copy,
  Check,
  RefreshCw,
  Search,
  Eye,
  RotateCcw,
  Webhook,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  ExternalLink,
} from 'lucide-react'

interface WebhookLog {
  id: string
  payload: any
  processed: boolean
  created_at: string
  error_message?: string
}

export default function WebhooksPage() {
  const supabase = createClient()
  const { showToast } = useToast()

  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)
  const [reprocessing, setReprocessing] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'processed' | 'pending'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const perPage = 20

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/participants`
    : '/api/webhooks/participants'

  useEffect(() => {
    fetchLogs()
  }, [statusFilter, dateFilter, page])

  const fetchLogs = async () => {
    setLoading(true)

    let query = supabase
      .from('webhooks_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply status filter
    if (statusFilter === 'processed') {
      query = query.eq('processed', true)
    } else if (statusFilter === 'pending') {
      query = query.eq('processed', false)
    }

    // Apply date filter
    const now = new Date()
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      query = query.gte('created_at', today)
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', weekAgo)
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', monthAgo)
    }

    // Pagination
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching logs:', error)
      showToast('Erro ao carregar logs', 'error')
    } else {
      setLogs(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      showToast('URL copiada!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      showToast('Erro ao copiar', 'error')
    }
  }

  const handleReprocess = async (log: WebhookLog) => {
    setReprocessing(log.id)

    try {
      const response = await fetch('/api/webhooks/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log.payload),
      })

      const result = await response.json()

      if (response.ok) {
        showToast(`Webhook reprocessado: ${result.action}`, 'success')
        fetchLogs()
      } else {
        showToast(result.error || 'Erro ao reprocessar', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Erro ao reprocessar', 'error')
    } finally {
      setReprocessing(null)
    }
  }

  const getParticipantName = (payload: any): string => {
    return payload?.fields?.nome_completo || payload?.name || 'N/A'
  }

  const getParticipantEmail = (payload: any): string => {
    return payload?.fields?.digite_seu_melhor_email || payload?.email || '-'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter logs by search term (client-side)
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true
    const name = getParticipantName(log.payload).toLowerCase()
    const email = getParticipantEmail(log.payload).toLowerCase()
    const search = searchTerm.toLowerCase()
    return name.includes(search) || email.includes(search)
  })

  const totalPages = Math.ceil(totalCount / perPage)

  // Stats
  const processedCount = logs.filter(l => l.processed).length
  const pendingCount = logs.filter(l => !l.processed).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="text-gray-600">Gerencie e monitore os webhooks de participantes</p>
      </div>

      {/* Webhook URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Endpoint do Webhook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg text-sm font-mono break-all">
                {webhookUrl}
              </code>
              <Button onClick={handleCopyUrl} variant="secondary">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              <p><strong>Método:</strong> POST</p>
              <p><strong>Content-Type:</strong> application/json</p>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-blue-600 hover:underline font-medium">
                Ver formato do payload esperado
              </summary>
              <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "participant_id": "uuid-do-formulario",
  "form_name": "Participante - Standard",
  "event_name": "Intensivo Da Alta Performance",
  "status": "registered",
  "created_at": "2026-01-27T15:58:20.33569+00:00",
  "fields": {
    "nome_completo": "Nome do Participante",
    "digite_seu_melhor_email": "email@exemplo.com",
    "digite_seu_whatsapp": "(11) 99999-9999",
    "qual_seu_do_instagram": "@usuario",
    "digite_o_seu_cpf_ou_cnpj": "000.000.000-00",
    "nome_para_cracha": "Nome Crachá",
    "voce_tem_socio": "Sim/Não",
    "qual_sua_area_de_atuacao_profissional": "Nicho",
    "o_que_pretende_aprender_no_intensivo...": "Resposta",
    "qual_sua_maior_dificuldade_no_seu_negocio_hoje": "Resposta",
    "quanto_voce_fatura_por_mes": "Faixa de faturamento",
    "qual_seu_lucro_liquido_mensal": "Faixa de lucro",
    "qual_sua_melhor_foto_de_perfil...": "URL da foto"
  }
}`}
              </pre>
            </details>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Webhooks</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
              <Webhook className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processados</p>
                <p className="text-2xl font-bold text-green-600">{processedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any)
                setPage(1)
              }}
              options={[
                { value: 'all', label: 'Todos os status' },
                { value: 'processed', label: 'Processados' },
                { value: 'pending', label: 'Pendentes' },
              ]}
            />
            <Select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as any)
                setPage(1)
              }}
              options={[
                { value: 'all', label: 'Todo período' },
                { value: 'today', label: 'Hoje' },
                { value: 'week', label: 'Última semana' },
                { value: 'month', label: 'Último mês' },
              ]}
            />
            <Button variant="secondary" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loading />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum webhook encontrado
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-gray-500">Status</th>
                      <th className="pb-3 font-medium text-gray-500">Participante</th>
                      <th className="pb-3 font-medium text-gray-500">Email</th>
                      <th className="pb-3 font-medium text-gray-500">Recebido em</th>
                      <th className="pb-3 font-medium text-gray-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-3">
                          {log.processed ? (
                            <Badge variant="success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Processado
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 font-medium">
                          {getParticipantName(log.payload)}
                        </td>
                        <td className="py-3 text-gray-600 text-sm">
                          {getParticipantEmail(log.payload)}
                        </td>
                        <td className="py-3 text-gray-500 text-sm">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!log.processed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReprocess(log)}
                                loading={reprocessing === log.id}
                                title="Reprocessar"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Mostrando {(page - 1) * perPage + 1} a {Math.min(page * perPage, totalCount)} de {totalCount}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detalhes do Webhook"
        className="max-w-3xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">ID:</span>
                <p className="font-mono text-xs">{selectedLog.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <p>
                  {selectedLog.processed ? (
                    <Badge variant="success">Processado</Badge>
                  ) : (
                    <Badge variant="warning">Pendente</Badge>
                  )}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Recebido em:</span>
                <p>{formatDate(selectedLog.created_at)}</p>
              </div>
              <div>
                <span className="text-gray-500">Participante:</span>
                <p className="font-medium">{getParticipantName(selectedLog.payload)}</p>
              </div>
            </div>

            <div>
              <span className="text-gray-500 text-sm">Payload completo:</span>
              <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              {!selectedLog.processed && (
                <Button
                  onClick={() => {
                    handleReprocess(selectedLog)
                    setSelectedLog(null)
                  }}
                  loading={reprocessing === selectedLog.id}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reprocessar
                </Button>
              )}
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
