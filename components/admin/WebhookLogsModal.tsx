'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Badge, Loading } from '@/components/ui'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Copy,
} from 'lucide-react'

interface WebhookLog {
  id: string
  created_at: string
  direcao: 'inbound' | 'outbound'
  evento: string
  url: string
  metodo: string
  request_body: any
  response_status: number
  response_body: string
  duracao_ms: number
  tentativa: number
  status: 'success' | 'error' | 'timeout' | 'retry'
  erro_mensagem: string
  ip_origem: string
  webhooks?: {
    nome: string
    tipo: string
    categoria: string
  }
}

interface WebhookLogsModalProps {
  isOpen: boolean
  onClose: () => void
  eventId?: string
}

export function WebhookLogsModal({ isOpen, onClose, eventId }: WebhookLogsModalProps) {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0, timeout: 0 })
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    direcao: 'all',
    periodo: 'week',
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '30',
        status: filters.status,
        direcao: filters.direcao,
        periodo: filters.periodo,
      })
      if (eventId) params.set('event_id', eventId)

      const res = await fetch(`/api/admin/webhooks/logs?${params}`)
      const data = await res.json()

      if (data.logs) {
        setLogs(data.logs)
        setStats(data.stats)
        setTotalPages(data.total_pages)
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen, page, filters])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'timeout':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'retry':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
      success: 'success',
      error: 'danger',
      timeout: 'warning',
      retry: 'default',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Logs de Webhooks" className="max-w-4xl">
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.success}</p>
            <p className="text-xs text-green-600">Sucesso</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.error}</p>
            <p className="text-xs text-red-600">Erros</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.timeout}</p>
            <p className="text-xs text-yellow-600">Timeout</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-lg">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">Todos status</option>
            <option value="success">Sucesso</option>
            <option value="error">Erro</option>
            <option value="timeout">Timeout</option>
            <option value="retry">Retry</option>
          </select>
          <select
            value={filters.direcao}
            onChange={(e) => { setFilters({ ...filters, direcao: e.target.value }); setPage(1) }}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">Todas direções</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
          <select
            value={filters.periodo}
            onChange={(e) => { setFilters({ ...filters, periodo: e.target.value }); setPage(1) }}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="today">Hoje</option>
            <option value="week">Última semana</option>
            <option value="month">Último mês</option>
            <option value="all">Todos</option>
          </select>
          <button
            onClick={fetchLogs}
            className="ml-auto p-1.5 rounded hover:bg-gray-200"
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Logs List */}
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="py-8 text-center">
              <Loading />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Nenhum log encontrado
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`border rounded-lg overflow-hidden ${
                  log.status === 'error' ? 'border-red-200 bg-red-50/50' :
                  log.status === 'timeout' ? 'border-yellow-200 bg-yellow-50/50' :
                  'border-gray-200'
                }`}
              >
                {/* Log Header */}
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                >
                  {getStatusIcon(log.status)}
                  <div className="flex items-center gap-2">
                    {log.direcao === 'inbound' ? (
                      <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3 text-purple-500" />
                    )}
                    <span className="text-xs text-gray-500">{log.direcao}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">
                    {log.webhooks?.nome || log.evento || 'Webhook'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {log.response_status && (
                      <span className={`mr-2 ${log.response_status >= 400 ? 'text-red-600' : 'text-green-600'}`}>
                        {log.response_status}
                      </span>
                    )}
                    {log.duracao_ms}ms
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                  {expandedLog === log.id ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {/* Log Details (Expanded) */}
                {expandedLog === log.id && (
                  <div className="px-3 py-3 border-t bg-white space-y-3">
                    {/* Error Message */}
                    {log.erro_mensagem && (
                      <div className="p-2 bg-red-100 rounded text-sm text-red-700">
                        <strong>Erro:</strong> {log.erro_mensagem}
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Método:</span>
                        <span className="ml-1 font-mono">{log.metodo}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tentativa:</span>
                        <span className="ml-1">{log.tentativa}</span>
                      </div>
                      {log.ip_origem && (
                        <div>
                          <span className="text-gray-500">IP:</span>
                          <span className="ml-1 font-mono">{log.ip_origem}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Categoria:</span>
                        <span className="ml-1">{log.webhooks?.categoria || '-'}</span>
                      </div>
                    </div>

                    {/* URL */}
                    {log.url && (
                      <div>
                        <span className="text-xs text-gray-500">URL:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 text-xs bg-gray-100 p-1 rounded truncate">
                            {log.url}
                          </code>
                          <button
                            onClick={() => copyToClipboard(log.url)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {log.request_body && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Request Body:</span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(log.request_body, null, 2))}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <pre className="mt-1 text-xs bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(log.request_body, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Response Body */}
                    {log.response_body && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Response Body:</span>
                          <button
                            onClick={() => copyToClipboard(log.response_body)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <pre className="mt-1 text-xs bg-gray-900 text-blue-400 p-2 rounded overflow-auto max-h-32">
                          {log.response_body}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
