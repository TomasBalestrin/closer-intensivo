'use client'

import { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  useToast,
} from '@/components/ui'
import {
  Copy,
  Check,
  Users,
  CalendarCheck,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface WebhookInfo {
  id: string
  title: string
  description: string
  path: string
  icon: React.ReactNode
  color: string
  fields: { name: string; type: string; required: boolean; description: string }[]
  examplePayload: Record<string, any>
}

const WEBHOOKS: WebhookInfo[] = [
  {
    id: 'participants',
    title: 'Participantes',
    description: 'Importar e atualizar dados dos participantes. Se o participante já existir (por email, CPF ou nome), os dados serão atualizados.',
    path: '/api/webhooks/participants',
    icon: <Users className="h-6 w-6" />,
    color: 'bg-blue-500',
    fields: [
      { name: 'fields.nome_completo', type: 'string', required: true, description: 'Nome completo do participante' },
      { name: 'fields.digite_seu_melhor_email', type: 'string', required: false, description: 'Email do participante' },
      { name: 'fields.digite_seu_whatsapp', type: 'string', required: false, description: 'Telefone/WhatsApp' },
      { name: 'fields.qual_seu_do_instagram', type: 'string', required: false, description: 'Instagram (com ou sem @)' },
      { name: 'fields.digite_o_seu_cpf_ou_cnpj', type: 'string', required: false, description: 'CPF ou CNPJ' },
      { name: 'fields.nome_para_cracha', type: 'string', required: false, description: 'Nome para crachá' },
      { name: 'fields.voce_tem_socio', type: 'string', required: false, description: 'Se tem sócio (Sim/Não)' },
      { name: 'fields.qual_sua_area_de_atuacao_profissional', type: 'string', required: false, description: 'Nicho/área de atuação' },
      { name: 'fields.quanto_voce_fatura_por_mes', type: 'string', required: false, description: 'Faturamento mensal' },
      { name: 'fields.qual_seu_lucro_liquido_mensal', type: 'string', required: false, description: 'Lucro líquido mensal' },
      { name: 'fields.qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos', type: 'string', required: false, description: 'URL da foto de perfil' },
      { name: 'participant_id', type: 'string', required: false, description: 'ID externo (para deduplicação)' },
    ],
    examplePayload: {
      participant_id: '12345',
      form_name: 'Inscrição Intensivo',
      event_name: 'form_submitted',
      status: 'registered',
      fields: {
        nome_completo: 'João Silva',
        digite_seu_melhor_email: 'joao@email.com',
        digite_seu_whatsapp: '11999999999',
        qual_seu_do_instagram: '@joaosilva',
        digite_o_seu_cpf_ou_cnpj: '123.456.789-00',
        nome_para_cracha: 'João',
        qual_sua_area_de_atuacao_profissional: 'Marketing Digital',
        quanto_voce_fatura_por_mes: 'R$ 20.000,00 até R$ 50.000,00',
        qual_seu_lucro_liquido_mensal: 'R$ 10.000',
      },
    },
  },
  {
    id: 'checkin',
    title: 'Credenciamento',
    description: 'Registrar o check-in dos participantes nos dias do evento. Identifica o participante por email, CPF, nome ou ID externo.',
    path: '/api/webhooks/checkin',
    icon: <CalendarCheck className="h-6 w-6" />,
    color: 'bg-emerald-500',
    fields: [
      { name: 'email', type: 'string', required: false, description: 'Email do participante (identificação prioritária)' },
      { name: 'cpf', type: 'string', required: false, description: 'CPF do participante (alternativa)' },
      { name: 'name', type: 'string', required: false, description: 'Nome completo (alternativa)' },
      { name: 'participant_id', type: 'string', required: false, description: 'ID externo (alternativa)' },
      { name: 'day', type: 'number', required: true, description: 'Dia do evento (1, 2 ou 3)' },
    ],
    examplePayload: {
      email: 'joao@email.com',
      day: 1,
    },
  },
  {
    id: 'answers',
    title: 'Respostas',
    description: 'Importar respostas de dificuldade e objetivo dos participantes. Aceita qualquer estrutura JSON e detecta os campos automaticamente.',
    path: '/api/webhooks/answers',
    icon: <MessageSquare className="h-6 w-6" />,
    color: 'bg-purple-500',
    fields: [
      { name: 'email / cpf / nome / participant_id', type: 'string', required: true, description: 'Identificação do participante (pelo menos um)' },
      { name: 'dificuldade', type: 'string', required: false, description: 'Maior dificuldade no negócio (aliases: challenge, desafio, maior_dificuldade, etc.)' },
      { name: 'objetivo', type: 'string', required: false, description: 'O que busca no intensivo (aliases: desired_change, o_que_busca, meta, expectativa, etc.)' },
    ],
    examplePayload: {
      fields: {
        email: 'joao@email.com',
        dificuldade: 'Escalar vendas sem perder qualidade',
        objetivo: 'Aprender técnicas de fechamento e gestão de equipe',
      },
    },
  },
]

export default function WebhooksPage() {
  const { showToast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getFullUrl = (path: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return path
  }

  const handleCopy = async (path: string, id: string) => {
    const url = getFullUrl(path)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      showToast('URL copiada!', 'success')
    } catch {
      showToast('Erro ao copiar', 'error')
    }
  }

  const handleCopyPayload = async (payload: Record<string, any>) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      showToast('Payload copiado!', 'success')
    } catch {
      showToast('Erro ao copiar', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="text-gray-600">Endpoints para receber dados externos via webhook</p>
      </div>

      <div className="space-y-4">
        {WEBHOOKS.map((webhook) => (
          <Card key={webhook.id}>
            <CardContent className="py-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className={`${webhook.color} text-white p-3 rounded-xl flex-shrink-0`}>
                  {webhook.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{webhook.title}</h3>
                    <Badge variant="success">Ativo</Badge>
                    <Badge variant="info">POST</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{webhook.description}</p>

                  {/* URL */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 font-mono text-sm text-gray-700 truncate">
                      {getFullUrl(webhook.path)}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCopy(webhook.path, webhook.id)}
                      className="flex-shrink-0"
                    >
                      {copiedId === webhook.id ? (
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
                onClick={() => setExpandedId(expandedId === webhook.id ? null : webhook.id)}
                className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {expandedId === webhook.id ? (
                  <><ChevronUp className="h-4 w-4" /> Ocultar documentação</>
                ) : (
                  <><ChevronDown className="h-4 w-4" /> Ver documentação</>
                )}
              </button>

              {/* Documentation */}
              {expandedId === webhook.id && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  {/* Fields table */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Campos aceitos:</h4>
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
                          {webhook.fields.map((field) => (
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
                  </div>

                  {/* Example payload */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Exemplo de payload:</h4>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyPayload(webhook.examplePayload)}>
                        <Copy className="h-3 w-3 mr-1" /> Copiar
                      </Button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(webhook.examplePayload, null, 2)}
                    </pre>
                  </div>

                  {/* Test link */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Testar:</strong> Envie um POST para a URL acima com o payload de exemplo.
                      Acessar via GET mostra a documentação do endpoint:
                    </p>
                    <a
                      href={webhook.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1 font-medium"
                    >
                      Abrir documentação <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
