'use client'

import { useState, useEffect } from 'react'
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
  Plus,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Webhook,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Trash2,
  Play,
  Power,
  PowerOff,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Key,
  Send,
} from 'lucide-react'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_CATEGORIAS,
  AUTH_TYPES,
  type Webhook as WebhookType,
  type WebhookLog,
} from '@/lib/webhooks/types'

type ViewMode = 'list' | 'logs'

export default function WebhooksPage() {
  const { showToast } = useToast()

  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookType | null>(null)

  // Create/Edit Modal
  const [editModal, setEditModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'inbound' as 'inbound' | 'outbound',
    categoria: 'participantes',
    url: '',
    metodo: 'POST',
    eventos: [] as string[],
    auth_type: 'none',
    auth_value: '',
    custom_headers: '{}',
    retry_attempts: 3,
    retry_delay_seconds: 30,
    timeout_seconds: 30,
    secret_key: '',
    ativo: true,
  })

  // Test Modal
  const [testModal, setTestModal] = useState(false)
  const [testWebhook, setTestWebhook] = useState<WebhookType | null>(null)
  const [testPayload, setTestPayload] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  // Logs View
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsStatusFilter, setLogsStatusFilter] = useState('all')
  const [logsPeriodo, setLogsPeriodo] = useState('all')
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tipoFilter, setTipoFilter] = useState<'all' | 'inbound' | 'outbound'>('all')

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/webhooks')
      const data = await res.json()
      setWebhooks(Array.isArray(data) ? data : [])
    } catch {
      showToast('Erro ao carregar webhooks', 'error')
    }
    setLoading(false)
  }

  const fetchLogs = async (webhookId: string, page = 1) => {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...(logsStatusFilter !== 'all' && { status: logsStatusFilter }),
        ...(logsPeriodo !== 'all' && { periodo: logsPeriodo }),
      })
      const res = await fetch(`/api/admin/webhooks/${webhookId}/logs?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
      setLogsTotalPages(data.total_pages || 1)
      setLogsTotal(data.total || 0)
      setLogsPage(page)
    } catch {
      showToast('Erro ao carregar logs', 'error')
    }
    setLogsLoading(false)
  }

  const openCreateModal = () => {
    setEditingWebhook(null)
    setFormData({
      nome: '', descricao: '', tipo: 'inbound', categoria: 'participantes',
      url: '', metodo: 'POST', eventos: [], auth_type: 'none', auth_value: '',
      custom_headers: '{}', retry_attempts: 3, retry_delay_seconds: 30,
      timeout_seconds: 30, secret_key: '', ativo: true,
    })
    setEditModal(true)
  }

  const openEditModal = (webhook: WebhookType) => {
    setEditingWebhook(webhook)
    setFormData({
      nome: webhook.nome,
      descricao: webhook.descricao || '',
      tipo: webhook.tipo,
      categoria: webhook.categoria || 'participantes',
      url: webhook.url || '',
      metodo: webhook.metodo || 'POST',
      eventos: webhook.eventos || [],
      auth_type: webhook.auth_type || 'none',
      auth_value: '',
      custom_headers: JSON.stringify(webhook.custom_headers || {}, null, 2),
      retry_attempts: webhook.retry_attempts || 3,
      retry_delay_seconds: webhook.retry_delay_seconds || 30,
      timeout_seconds: webhook.timeout_seconds || 30,
      secret_key: webhook.secret_key || '',
      ativo: webhook.ativo,
    })
    setEditModal(true)
  }

  const handleSave = async () => {
    if (!formData.nome.trim()) { showToast('Nome é obrigatório', 'error'); return }
    if (formData.tipo === 'outbound' && !formData.url.trim()) {
      showToast('URL é obrigatória para webhooks outbound', 'error'); return
    }
    setSaving(true)
    try {
      let customHeaders = {}
      try { customHeaders = JSON.parse(formData.custom_headers) } catch {}
      const payload = { ...formData, custom_headers: customHeaders }
      const url = editingWebhook ? `/api/admin/webhooks/${editingWebhook.id}` : '/api/admin/webhooks'
      const res = await fetch(url, {
        method: editingWebhook ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showToast(editingWebhook ? 'Webhook atualizado!' : 'Webhook criado!', 'success')
      setEditModal(false)
      fetchWebhooks()
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (webhook: WebhookType) => {
    if (!confirm(`Excluir "${webhook.nome}"?`)) return
    try {
      await fetch(`/api/admin/webhooks/${webhook.id}`, { method: 'DELETE' })
      showToast('Webhook excluído!', 'success')
      fetchWebhooks()
    } catch { showToast('Erro ao excluir', 'error') }
  }

  const handleToggle = async (webhook: WebhookType) => {
    try {
      await fetch(`/api/admin/webhooks/${webhook.id}/toggle`, { method: 'POST' })
      showToast(`Webhook ${webhook.ativo ? 'desativado' : 'ativado'}!`, 'success')
      fetchWebhooks()
    } catch { showToast('Erro ao alterar status', 'error') }
  }

  const handleRegenerateToken = async (webhook: WebhookType) => {
    if (!confirm('Regenerar token? A URL antiga deixará de funcionar.')) return
    try {
      await fetch(`/api/admin/webhooks/${webhook.id}/regenerate-token`, { method: 'POST' })
      showToast('Token regenerado!', 'success')
      fetchWebhooks()
    } catch { showToast('Erro ao regenerar', 'error') }
  }

  const handleCopyUrl = async (webhook: WebhookType) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = webhook.tipo === 'inbound'
      ? `${baseUrl}/api/webhooks/${webhook.categoria}/${webhook.token}`
      : webhook.url || ''
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(webhook.id)
      setTimeout(() => setCopiedId(null), 2000)
      showToast('URL copiada!', 'success')
    } catch { showToast('Erro ao copiar', 'error') }
  }

  const openTestModal = (webhook: WebhookType) => {
    setTestWebhook(webhook)
    setTestResult(null)
    setTestPayload(JSON.stringify({
      event: 'test', timestamp: new Date().toISOString(),
      data: { id: 'test-uuid-123', nome: 'Participante Teste', email: 'teste@email.com' },
    }, null, 2))
    setTestModal(true)
  }

  const handleTest = async () => {
    if (!testWebhook) return
    setTesting(true)
    setTestResult(null)
    try {
      let payload = {}
      try { payload = JSON.parse(testPayload) } catch { showToast('JSON inválido', 'error'); setTesting(false); return }
      const res = await fetch(`/api/admin/webhooks/${testWebhook.id}/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      })
      setTestResult(await res.json())
    } catch (error: any) {
      setTestResult({ success: false, error: error.message })
    }
    setTesting(false)
  }

  const openLogsView = (webhook: WebhookType) => {
    setSelectedWebhook(webhook)
    setViewMode('logs')
    setLogsPage(1)
    setLogsStatusFilter('all')
    setLogsPeriodo('all')
    fetchLogs(webhook.id, 1)
  }

  const toggleEvento = (evento: string) => {
    setFormData(prev => ({
      ...prev,
      eventos: prev.eventos.includes(evento)
        ? prev.eventos.filter(e => e !== evento)
        : [...prev.eventos, evento],
    }))
  }

  const filteredWebhooks = webhooks.filter(w => tipoFilter === 'all' || w.tipo === tipoFilter)
  const inboundWebhooks = filteredWebhooks.filter(w => w.tipo === 'inbound')
  const outboundWebhooks = filteredWebhooks.filter(w => w.tipo === 'outbound')

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Agora'
    if (mins < 60) return `há ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `há ${hours}h`
    return `há ${Math.floor(hours / 24)}d`
  }

  const getSuccessRate = (w: WebhookType) => {
    if (w.total_requisicoes === 0) return '-'
    return `${((w.total_sucesso / w.total_requisicoes) * 100).toFixed(0)}%`
  }

  // =========================================
  // LOGS VIEW
  // =========================================
  if (viewMode === 'logs' && selectedWebhook) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setViewMode('list')}>
            &larr; Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs: {selectedWebhook.nome}</h1>
            <p className="text-gray-500 text-sm">{selectedWebhook.tipo === 'inbound' ? 'Recebimento' : 'Disparo'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{logsTotal}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Sucesso</p><p className="text-2xl font-bold text-green-600">{selectedWebhook.total_sucesso}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Falha</p><p className="text-2xl font-bold text-red-600">{selectedWebhook.total_falha}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Taxa Sucesso</p><p className="text-2xl font-bold">{getSuccessRate(selectedWebhook)}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Select value={logsPeriodo} onChange={(e) => { setLogsPeriodo(e.target.value); fetchLogs(selectedWebhook.id, 1) }}
                options={[{ value: 'all', label: 'Todo período' }, { value: 'today', label: 'Hoje' }, { value: 'week', label: 'Última semana' }, { value: 'month', label: 'Último mês' }]} />
              <Select value={logsStatusFilter} onChange={(e) => { setLogsStatusFilter(e.target.value); fetchLogs(selectedWebhook.id, 1) }}
                options={[{ value: 'all', label: 'Todos' }, { value: 'success', label: 'Sucesso' }, { value: 'error', label: 'Erro' }, { value: 'timeout', label: 'Timeout' }]} />
              <Button variant="secondary" onClick={() => fetchLogs(selectedWebhook.id, logsPage)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {logsLoading ? (
              <div className="flex justify-center py-8"><Loading /></div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum log encontrado</div>
            ) : (
              <>
                <div className="space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(log)}>
                      {log.status === 'success' ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        : log.status === 'timeout' ? <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatDate(log.created_at)}</span>
                          <Badge variant={log.status === 'success' ? 'success' : log.status === 'timeout' ? 'warning' : 'danger'}>
                            {log.status === 'success' ? `${log.response_status} OK` : log.status}
                          </Badge>
                          {log.evento && <span className="text-xs text-gray-500">{log.evento}</span>}
                        </div>
                        {log.erro_mensagem && <p className="text-xs text-red-500 mt-1 truncate">{log.erro_mensagem}</p>}
                      </div>
                      <span className="text-xs text-gray-500">{log.duracao_ms ? `${log.duracao_ms}ms` : ''}</span>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
                {logsTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">Página {logsPage} de {logsTotalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => fetchLogs(selectedWebhook.id, logsPage - 1)} disabled={logsPage === 1}>Anterior</Button>
                      <Button variant="secondary" size="sm" onClick={() => fetchLogs(selectedWebhook.id, logsPage + 1)} disabled={logsPage === logsTotalPages}>Próximo</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Log Detail Modal */}
        <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Detalhes do Log" className="max-w-3xl">
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Status:</span>
                  <Badge variant={selectedLog.status === 'success' ? 'success' : 'danger'} className="ml-2">{selectedLog.status}</Badge></div>
                <div><span className="text-gray-500">Data:</span><p>{formatDate(selectedLog.created_at)}</p></div>
                <div><span className="text-gray-500">Evento:</span><p>{selectedLog.evento || '-'}</p></div>
                <div><span className="text-gray-500">Duração:</span><p>{selectedLog.duracao_ms ? `${selectedLog.duracao_ms}ms` : '-'}</p></div>
                {selectedLog.response_status && <div><span className="text-gray-500">HTTP:</span><p>{selectedLog.response_status}</p></div>}
                {selectedLog.ip_origem && <div><span className="text-gray-500">IP:</span><p className="font-mono text-xs">{selectedLog.ip_origem}</p></div>}
              </div>
              {selectedLog.erro_mensagem && (
                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700"><strong>Erro:</strong> {selectedLog.erro_mensagem}</div>
              )}
              {selectedLog.request_body && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Request Body:</p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-64">{JSON.stringify(selectedLog.request_body, null, 2)}</pre>
                </div>
              )}
              {selectedLog.response_body && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Response:</p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-40">{selectedLog.response_body}</pre>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    )
  }

  // =========================================
  // LIST VIEW
  // =========================================
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-gray-600">Gerencie webhooks de recebimento e disparo</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Webhook
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'inbound', 'outbound'] as const).map(tipo => (
          <Button key={tipo} variant={tipoFilter === tipo ? 'primary' : 'secondary'} size="sm"
            onClick={() => setTipoFilter(tipo)}>
            {tipo === 'all' ? 'Todos' : tipo === 'inbound' ? 'Recebimento' : 'Disparo'}
          </Button>
        ))}
        <div className="ml-auto">
          <Button variant="secondary" size="sm" onClick={fetchWebhooks}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loading /></div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Webhook className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum webhook configurado</h3>
            <p className="text-gray-500 mb-6">Crie seu primeiro webhook para integrar.</p>
            <Button onClick={openCreateModal}><Plus className="h-4 w-4 mr-2" />Criar Webhook</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {(tipoFilter === 'all' || tipoFilter === 'inbound') && inboundWebhooks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4" /> Webhooks Inbound (Recebimento)
              </h2>
              <div className="space-y-3">
                {inboundWebhooks.map(w => (
                  <WebhookCard key={w.id} webhook={w} copiedId={copiedId}
                    onCopy={() => handleCopyUrl(w)} onEdit={() => openEditModal(w)}
                    onLogs={() => openLogsView(w)} onTest={() => openTestModal(w)}
                    onToggle={() => handleToggle(w)} onDelete={() => handleDelete(w)}
                    onRegenerateToken={() => handleRegenerateToken(w)}
                    formatTimeAgo={formatTimeAgo} getSuccessRate={getSuccessRate} />
                ))}
              </div>
            </div>
          )}
          {(tipoFilter === 'all' || tipoFilter === 'outbound') && outboundWebhooks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" /> Webhooks Outbound (Disparo)
              </h2>
              <div className="space-y-3">
                {outboundWebhooks.map(w => (
                  <WebhookCard key={w.id} webhook={w} copiedId={copiedId}
                    onCopy={() => handleCopyUrl(w)} onEdit={() => openEditModal(w)}
                    onLogs={() => openLogsView(w)} onTest={() => openTestModal(w)}
                    onToggle={() => handleToggle(w)} onDelete={() => handleDelete(w)}
                    formatTimeAgo={formatTimeAgo} getSuccessRate={getSuccessRate} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE/EDIT MODAL */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)}
        title={editingWebhook ? 'Editar Webhook' : 'Novo Webhook'} className="max-w-2xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <Input label="Nome *" value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Notificação CRM" />
          <Input label="Descrição" value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />

          {!editingWebhook && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
              <div className="flex gap-4">
                {(['inbound', 'outbound'] as const).map(tipo => (
                  <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tipo" value={tipo} checked={formData.tipo === tipo}
                      onChange={() => setFormData({ ...formData, tipo })} className="text-blue-600" />
                    <span className="text-sm">{tipo === 'inbound' ? 'Inbound (Receber)' : 'Outbound (Enviar)'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {formData.tipo === 'inbound' && (
            <>
              <Select label="Categoria *" value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                options={WEBHOOK_CATEGORIAS.map(c => ({ value: c.value, label: c.label }))} />
              <Input label="Secret Key (HMAC, opcional)" value={formData.secret_key}
                onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })} />
            </>
          )}

          {formData.tipo === 'outbound' && (
            <>
              <Input label="URL de Destino *" value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://api.exemplo.com/webhook" />
              <Select label="Método" value={formData.metodo}
                onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
                options={[{ value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }]} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Eventos</label>
                <div className="space-y-3">
                  {['Participantes', 'Vendas', 'Credenciamento', 'Formulários', 'Qualificação'].map(group => {
                    const events = WEBHOOK_EVENTS.filter(e => e.group === group)
                    if (events.length === 0) return null
                    return (
                      <div key={group}>
                        <p className="text-xs font-medium text-gray-500 mb-1">{group}</p>
                        <div className="flex flex-wrap gap-2">
                          {events.map(event => (
                            <label key={event.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input type="checkbox" checked={formData.eventos.includes(event.value)}
                                onChange={() => toggleEvento(event.value)} className="rounded text-blue-600" />
                              {event.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Select label="Autenticação" value={formData.auth_type}
                onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                options={AUTH_TYPES.map(a => ({ value: a.value, label: a.label }))} />
              {formData.auth_type !== 'none' && (
                <Input label={formData.auth_type === 'bearer' ? 'Bearer Token' : 'API Key'} type="password"
                  value={formData.auth_value}
                  onChange={(e) => setFormData({ ...formData, auth_value: e.target.value })}
                  placeholder={editingWebhook ? 'Vazio = manter atual' : ''} />
              )}

              <details className="border rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">Configurações Avançadas</summary>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Input label="Tentativas" type="number" value={formData.retry_attempts.toString()}
                    onChange={(e) => setFormData({ ...formData, retry_attempts: parseInt(e.target.value) || 3 })} />
                  <Input label="Delay (s)" type="number" value={formData.retry_delay_seconds.toString()}
                    onChange={(e) => setFormData({ ...formData, retry_delay_seconds: parseInt(e.target.value) || 30 })} />
                  <Input label="Timeout (s)" type="number" value={formData.timeout_seconds.toString()}
                    onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) || 30 })} />
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Headers Customizados (JSON)</label>
                  <textarea value={formData.custom_headers}
                    onChange={(e) => setFormData({ ...formData, custom_headers: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm font-mono" rows={3} />
                </div>
              </details>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editingWebhook ? 'Salvar' : 'Criar Webhook'}</Button>
          </div>
        </div>
      </Modal>

      {/* TEST MODAL */}
      <Modal isOpen={testModal} onClose={() => setTestModal(false)}
        title={`Testar: ${testWebhook?.nome}`} className="max-w-2xl">
        <div className="space-y-4">
          {testWebhook?.tipo === 'inbound' ? (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800"><strong>Webhook Inbound</strong> - Envie POST para:</p>
              <code className="block mt-2 text-xs bg-white p-2 rounded border break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/${testWebhook.categoria}/${testWebhook.token}` : ''}
              </code>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payload de Teste:</label>
                <textarea value={testPayload} onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm font-mono bg-gray-900 text-gray-100" rows={10} />
              </div>
              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                    <span className={`font-medium text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.success ? 'Sucesso' : 'Falha'} | {testResult.status} {testResult.statusText} | {testResult.duracao_ms}ms
                    </span>
                  </div>
                  {testResult.response_body && <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">{testResult.response_body}</pre>}
                  {testResult.error && <p className="text-sm text-red-700 mt-1">{testResult.error}</p>}
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setTestModal(false)}>Fechar</Button>
            {testWebhook?.tipo === 'outbound' && (
              <Button onClick={handleTest} loading={testing}><Send className="h-4 w-4 mr-2" />Enviar Teste</Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

// =========================================
// WEBHOOK CARD COMPONENT
// =========================================
function WebhookCard({ webhook, copiedId, onCopy, onEdit, onLogs, onTest, onToggle, onDelete, onRegenerateToken, formatTimeAgo, getSuccessRate }: {
  webhook: WebhookType; copiedId: string | null; onCopy: () => void; onEdit: () => void; onLogs: () => void;
  onTest: () => void; onToggle: () => void; onDelete: () => void; onRegenerateToken?: () => void;
  formatTimeAgo: (d: string | null) => string; getSuccessRate: (w: WebhookType) => string;
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const inboundUrl = webhook.tipo === 'inbound' ? `${baseUrl}/api/webhooks/${webhook.categoria}/${webhook.token}` : null

  return (
    <Card className={!webhook.ativo ? 'opacity-60' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${webhook.ativo ? (webhook.ultimo_status === 'error' ? 'bg-amber-400' : 'bg-green-500') : 'bg-red-500'}`} />
              <h3 className="font-semibold text-gray-900 truncate">{webhook.nome}</h3>
              <Badge variant={webhook.tipo === 'inbound' ? 'info' : 'warning'}>
                {webhook.tipo === 'inbound' ? 'Inbound' : 'Outbound'}
              </Badge>
              {!webhook.ativo && <Badge variant="danger">Inativo</Badge>}
            </div>
            {inboundUrl && <p className="text-xs text-gray-500 font-mono truncate">POST {inboundUrl}</p>}
            {webhook.tipo === 'outbound' && webhook.url && <p className="text-xs text-gray-500 font-mono truncate">{webhook.metodo} {webhook.url}</p>}
            {webhook.tipo === 'outbound' && webhook.eventos?.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">Eventos: {webhook.eventos.join(', ')}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>Último: {formatTimeAgo(webhook.ultima_execucao)}</span>
              <span>{webhook.total_requisicoes} req</span>
              <span>Sucesso: {getSuccessRate(webhook)}</span>
              {webhook.total_falha > 0 && <span className="text-red-500">{webhook.total_falha} falha(s)</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onCopy} title="Copiar URL">
              {copiedId === webhook.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit} title="Configurar"><Settings className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={onLogs} title="Logs"><FileText className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={onTest} title="Testar"><Play className="h-4 w-4" /></Button>
            {webhook.tipo === 'inbound' && onRegenerateToken && (
              <Button variant="ghost" size="sm" onClick={onRegenerateToken} title="Regenerar Token"><Key className="h-4 w-4" /></Button>
            )}
            <Button variant="ghost" size="sm" onClick={onToggle} title={webhook.ativo ? 'Desativar' : 'Ativar'}>
              {webhook.ativo ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-green-500" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} title="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
