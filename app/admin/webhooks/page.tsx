'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Badge,
  Button,
  useToast,
} from '@/components/ui'
import {
  Copy,
  Check,
  Users,
  ClipboardCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface WebhookEndpoint {
  id: string
  name: string
  description: string
  path: string
  icon: React.ReactNode
  color: string
  documentation: {
    description: string
    fields: { name: string; type: string; required: boolean; description: string }[]
    example: Record<string, any>
  }
}

const webhookEndpoints: WebhookEndpoint[] = [
  {
    id: 'participants',
    name: 'Participantes',
    description: 'Importar e atualizar dados dos participantes. Se o participante já existir (por email, CPF ou nome), os dados serão atualizados.',
    path: '/api/webhooks/participants',
    icon: <Users className="h-6 w-6" />,
    color: 'bg-blue-500',
    documentation: {
      description: 'Recebe dados de participantes e cria/atualiza no banco de dados.',
      fields: [
        { name: 'event_id', type: 'UUID', required: true, description: 'ID do evento (query param ou no body)' },
        { name: 'name', type: 'string', required: true, description: 'Nome completo do participante' },
        { name: 'email', type: 'string', required: false, description: 'Email do participante' },
        { name: 'cpf', type: 'string', required: false, description: 'CPF do participante' },
        { name: 'phone', type: 'string', required: false, description: 'Telefone/WhatsApp' },
        { name: 'revenue', type: 'string', required: false, description: 'Faturamento mensal' },
        { name: 'niche', type: 'string', required: false, description: 'Área de atuação' },
      ],
      example: {
        event_id: 'ce225b43-21e4-4536-9919-04017296f085',
        name: 'João Silva',
        email: 'joao@email.com',
        cpf: '123.456.789-00',
        phone: '(11) 99999-9999',
        revenue: 'R$ 20.000,00 até R$ 50.000,00',
        niche: 'Marketing Digital',
      },
    },
  },
  {
    id: 'checkin',
    name: 'Credenciamento',
    description: 'Registrar o check-in dos participantes nos dias do evento. Identifica o participante por email, CPF, nome ou ID externo.',
    path: '/api/webhooks/checkin',
    icon: <ClipboardCheck className="h-6 w-6" />,
    color: 'bg-green-500',
    documentation: {
      description: 'Atualiza o status de check-in dos participantes para cada dia do evento.',
      fields: [
        { name: 'event_id', type: 'UUID', required: true, description: 'ID do evento (query param ou no body)' },
        { name: 'email', type: 'string', required: false, description: 'Email para identificar o participante' },
        { name: 'cpf', type: 'string', required: false, description: 'CPF para identificar o participante' },
        { name: 'name', type: 'string', required: false, description: 'Nome para identificar o participante' },
        { name: 'day', type: 'number', required: true, description: 'Dia do check-in (1, 2 ou 3)' },
        { name: 'checked_in', type: 'boolean', required: false, description: 'Status do check-in (default: true)' },
      ],
      example: {
        event_id: 'ce225b43-21e4-4536-9919-04017296f085',
        email: 'joao@email.com',
        day: 1,
        checked_in: true,
      },
    },
  },
  {
    id: 'answers',
    name: 'Respostas',
    description: 'Importar respostas de dificuldade e objetivo dos participantes. Aceita qualquer estrutura JSON e detecta os campos automaticamente.',
    path: '/api/webhooks/answers',
    icon: <MessageSquare className="h-6 w-6" />,
    color: 'bg-amber-500',
    documentation: {
      description: 'Atualiza as respostas de dificuldade e objetivo dos participantes.',
      fields: [
        { name: 'event_id', type: 'UUID', required: false, description: 'ID do evento (query param)' },
        { name: 'email', type: 'string', required: false, description: 'Email para identificar o participante' },
        { name: 'cpf', type: 'string', required: false, description: 'CPF para identificar o participante' },
        { name: 'challenge_answer', type: 'string', required: false, description: 'Resposta sobre maior dificuldade' },
        { name: 'desired_change_answer', type: 'string', required: false, description: 'Resposta sobre objetivo/expectativa' },
      ],
      example: {
        email: 'joao@email.com',
        challenge_answer: 'Escalar vendas sem perder qualidade',
        desired_change_answer: 'Aprender gestão de equipe e processos',
      },
    },
  },
]

export default function WebhooksPage() {
  const { showToast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedDocs, setExpandedDocs] = useState<string | null>(null)

  const getFullUrl = (path: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}${path}`
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      showToast('URL copiada!', 'success')
    } catch {
      showToast('Erro ao copiar', 'error')
    }
  }

  const toggleDocs = (id: string) => {
    setExpandedDocs(expandedDocs === id ? null : id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="text-gray-600">Endpoints para receber dados externos via webhook</p>
      </div>

      <div className="space-y-4">
        {webhookEndpoints.map((endpoint) => (
          <Card key={endpoint.id}>
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                <div className={`${endpoint.color} text-white p-3 rounded-xl flex-shrink-0`}>
                  {endpoint.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{endpoint.name}</h3>
                    <Badge variant="success">Ativo</Badge>
                    <Badge variant="info">POST</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {endpoint.description}
                  </p>

                  {/* URL */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 font-mono text-sm text-gray-700 truncate">
                      {getFullUrl(endpoint.path)}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCopy(getFullUrl(endpoint.path), endpoint.id)}
                      className="flex-shrink-0"
                    >
                      {copiedId === endpoint.id ? (
                        <><Check className="h-4 w-4 mr-1" /> Copiado</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                      )}
                    </Button>
                  </div>

                  {/* Toggle docs */}
                  <button
                    onClick={() => toggleDocs(endpoint.id)}
                    className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {expandedDocs === endpoint.id ? (
                      <><ChevronUp className="h-4 w-4" /> Ocultar documentação</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> Ver documentação</>
                    )}
                  </button>

                  {/* Documentation */}
                  {expandedDocs === endpoint.id && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <p className="text-sm text-gray-600">{endpoint.documentation.description}</p>

                      {/* Fields table */}
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
                            {endpoint.documentation.fields.map((field) => (
                              <tr key={field.name} className="border-b border-gray-50">
                                <td className="py-2 px-2 font-mono text-xs text-blue-700">{field.name}</td>
                                <td className="py-2 px-2 text-gray-500">{field.type}</td>
                                <td className="py-2 px-2">
                                  {field.required ? (
                                    <Badge variant="danger">Sim</Badge>
                                  ) : (
                                    <span className="text-gray-400">Não</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-gray-600">{field.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Example */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700">Exemplo de payload:</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(JSON.stringify(endpoint.documentation.example, null, 2), `${endpoint.id}-example`)}
                          >
                            {copiedId === `${endpoint.id}-example` ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copiar
                          </Button>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                          {JSON.stringify(endpoint.documentation.example, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info about event filtering */}
      <Card className="border-gray-200">
        <CardContent className="py-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Filtro por Evento</h3>
          <p className="text-sm text-gray-600 mb-3">
            Para filtrar os webhooks por evento específico, adicione o parâmetro <code className="bg-gray-100 px-1 rounded">event_id</code> na URL:
          </p>
          <div className="bg-gray-50 border rounded-lg px-3 py-2 font-mono text-sm text-gray-700">
            /api/webhooks/participants<span className="text-blue-600">?event_id=seu-event-id-aqui</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Ou inclua o <code className="bg-gray-100 px-1 rounded">event_id</code> diretamente no body do JSON.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
