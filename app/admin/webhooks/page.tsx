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
} from 'lucide-react'

interface EventOption {
  id: string
  nome_evento: string
}

export default function WebhooksPage() {
  const supabase = createClient()
  const { showToast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showDocs, setShowDocs] = useState(false)
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')

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
    </div>
  )
}
