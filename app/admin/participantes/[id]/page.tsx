'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  Badge,
  Checkbox,
  Modal,
  Loading,
  useToast,
} from '@/components/ui'
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  DollarSign,
  UserPlus,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  MessageSquare
} from 'lucide-react'
import { Participant, User, Form, Sale } from '@/lib/types'
import { getColorClass, getInstagramUrl, formatCurrency } from '@/lib/utils'

export default function ParticipantDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [closers, setClosers] = useState<User[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [assignCloserModal, setAssignCloserModal] = useState(false)
  const [saleModal, setSaleModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState({
    funnel: '',
    seller_closer_id: '',
    mentee_inviter: '',
    companion: '',
    is_opportunity: false,
    times_called: 0,
    color: '',
    qualification: '',
  })

  const [saleData, setSaleData] = useState({
    product: '',
    total_value: '',
    entry_value: '',
    negotiation_type: '',
  })

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    setLoading(true)

    const [participantRes, closersRes, formsRes, salesRes] = await Promise.all([
      supabase
        .from('participants')
        .select('*')
        .eq('id', params.id)
        .single(),
      supabase
        .from('users')
        .select('*')
        .eq('role', 'closer'),
      supabase
        .from('disc_forms')
        .select('*')
        .eq('participant_id', params.id),
      supabase
        .from('sales')
        .select('*')
        .eq('participant_id', params.id),
    ])

    if (participantRes.data) {
      setParticipant(participantRes.data)
      setFormData({
        funnel: participantRes.data.funnel || '',
        seller_closer_id: participantRes.data.seller_closer_id || '',
        mentee_inviter: participantRes.data.mentee_inviter || '',
        companion: participantRes.data.companion || '',
        is_opportunity: participantRes.data.is_opportunity,
        times_called: participantRes.data.times_called,
        color: participantRes.data.color || '',
        qualification: participantRes.data.qualification || '',
      })
    }

    setClosers(closersRes.data || [])
    setForms(formsRes.data || [])
    setSales(salesRes.data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('participants')
        .update({
          funnel: formData.funnel || null,
          seller_closer_id: formData.seller_closer_id || null,
          mentee_inviter: formData.mentee_inviter || null,
          companion: formData.companion || null,
          is_opportunity: formData.is_opportunity,
          times_called: formData.times_called,
          color: formData.color || null,
          qualification: formData.qualification || null,
        })
        .eq('id', params.id)

      if (error) throw error

      showToast('Participante atualizado com sucesso', 'success')
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignCloser = async (closerId: string) => {
    setFormLoading(true)
    try {
      const { error } = await supabase
        .from('participants')
        .update({ closer_id: closerId })
        .eq('id', params.id)

      if (error) throw error

      showToast('Closer atribuído com sucesso', 'success')
      setAssignCloserModal(false)
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao atribuir closer', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleGenerateForm = async () => {
    setFormLoading(true)
    try {
      const formId = crypto.randomUUID()
      const { error } = await supabase.from('disc_forms').insert({
        id: formId,
        participant_id: params.id as string,
        answers: {},
      })

      if (error) throw error

      showToast('Formulário gerado com sucesso', 'success')
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao gerar formulário', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase.from('sales').insert({
        participant_id: params.id as string,
        closer_id: participant?.closer_id || user.id,
        product: saleData.product,
        total_value: parseFloat(saleData.total_value),
        entry_value: parseFloat(saleData.entry_value),
        negotiation_type: saleData.negotiation_type,
      })

      if (error) throw error

      showToast('Venda registrada com sucesso', 'success')
      setSaleModal(false)
      setSaleData({
        product: '',
        total_value: '',
        entry_value: '',
        negotiation_type: '',
      })
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao registrar venda', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Participante não encontrado</p>
        <Button variant="secondary" onClick={() => router.back()} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  const assignedCloser = closers.find(c => c.id === participant.closer_id)
  const hasFormCompleted = participant.form_completed_at != null
  const hasDiscProfile = participant.disc_profile != null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{participant.name}</h1>
        {hasDiscProfile && (
          <Badge variant="info" className="text-lg px-3 py-1">
            DISC: {participant.disc_profile}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Webhook Data */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Webhook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 mb-6">
                <Avatar src={participant.photo_url} alt={participant.name} size="xl" />
                <div>
                  <h3 className="text-lg font-semibold">{participant.name}</h3>
                  {participant.revenue && (
                    <p className="text-gray-600">Faturamento: {participant.revenue}</p>
                  )}
                  {participant.niche && (
                    <span
                      className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${getColorClass(
                        participant.color
                      )}`}
                    >
                      {participant.niche}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Instagram:</span>
                  {participant.instagram ? (
                    <a
                      href={getInstagramUrl(participant.instagram) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {participant.instagram}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="ml-2 text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Credenciou Dia 1:</span>
                  <span className="ml-2">{participant.checked_in_day1 ? 'Sim' : 'Não'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Credenciou Dia 2:</span>
                  <span className="ml-2">{participant.checked_in_day2 ? 'Sim' : 'Não'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Credenciou Dia 3:</span>
                  <span className="ml-2">{participant.checked_in_day3 ? 'Sim' : 'Não'}</span>
                </div>
              </div>

              {participant.webhook_data && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Ver dados completos do webhook
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(participant.webhook_data, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          {/* DISC Analysis - Sales Insights */}
          {hasFormCompleted && hasDiscProfile && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Brain className="h-5 w-5" />
                  Análise DISC - Insights de Venda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* DISC Scores */}
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Perfil DISC: {participant.disc_profile}
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'D', value: participant.disc_score_d, color: 'bg-red-500', name: 'Dominância' },
                      { label: 'I', value: participant.disc_score_i, color: 'bg-yellow-500', name: 'Influência' },
                      { label: 'S', value: participant.disc_score_s, color: 'bg-green-500', name: 'Estabilidade' },
                      { label: 'C', value: participant.disc_score_c, color: 'bg-blue-500', name: 'Conformidade' },
                    ].map((score) => (
                      <div key={score.label} className="text-center">
                        <div className="text-xs text-gray-500 mb-1">{score.name}</div>
                        <div className="relative h-24 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className={`absolute bottom-0 left-0 right-0 ${score.color} transition-all`}
                            style={{ height: `${(score.value || 0) * 10}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-800">{score.label}</span>
                          </div>
                        </div>
                        <div className="text-sm font-medium mt-1">{score.value || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Personality Summary */}
                {participant.personality_summary && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      Resumo da Personalidade
                    </h4>
                    <p className="text-gray-700">{participant.personality_summary}</p>
                  </div>
                )}

                {/* Open Answers */}
                {(participant.challenge_answer || participant.desired_change_answer) && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Respostas Abertas</h4>
                    {participant.challenge_answer && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-500">Maior desafio:</p>
                        <p className="text-gray-700 italic">&ldquo;{participant.challenge_answer}&rdquo;</p>
                      </div>
                    )}
                    {participant.desired_change_answer && (
                      <div>
                        <p className="text-sm text-gray-500">Mudança desejada:</p>
                        <p className="text-gray-700 italic">&ldquo;{participant.desired_change_answer}&rdquo;</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Tips */}
                {participant.quick_tips && participant.quick_tips.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Dicas Rápidas
                    </h4>
                    <ul className="space-y-1">
                      {participant.quick_tips.map((tip: string, i: number) => (
                        <li key={i} className="text-green-700 flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decision Triggers */}
                {participant.decision_triggers && Array.isArray(participant.decision_triggers) && participant.decision_triggers.length > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-orange-600" />
                      Gatilhos de Decisão
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(participant.decision_triggers as string[]).map((trigger: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Predicted Objections with Scripts */}
                {participant.predicted_objections && Array.isArray(participant.predicted_objections) && participant.predicted_objections.length > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Objeções Previstas + Scripts
                    </h4>
                    <div className="space-y-4">
                      {(participant.predicted_objections as Array<{objection: string; script: string}>).map((obj, i: number) => (
                        <div key={i} className="border-l-4 border-amber-400 pl-4">
                          <p className="font-medium text-amber-800">&ldquo;{obj.objection}&rdquo;</p>
                          <p className="text-gray-600 text-sm mt-1">
                            <span className="font-medium text-gray-700">Resposta: </span>
                            {obj.script}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Closing Strategies */}
                {participant.closing_strategies && Array.isArray(participant.closing_strategies) && participant.closing_strategies.length > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Estratégias de Fechamento
                    </h4>
                    <div className="space-y-3">
                      {(participant.closing_strategies as Array<{name: string; script: string}>).map((strategy, i: number) => (
                        <div key={i} className="bg-green-50 rounded-lg p-3">
                          <p className="font-medium text-green-800">{strategy.name}</p>
                          <p className="text-green-700 text-sm mt-1">&ldquo;{strategy.script}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Things to Avoid */}
                {participant.things_to_avoid && participant.things_to_avoid.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      O Que Evitar
                    </h4>
                    <ul className="space-y-1">
                      {participant.things_to_avoid.map((item: string, i: number) => (
                        <li key={i} className="text-red-700 flex items-start gap-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Campos Manuais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Funil de Origem"
                  value={formData.funnel}
                  onChange={(e) => setFormData({ ...formData, funnel: e.target.value })}
                />
                <Select
                  label="Vendedor/Convidador"
                  value={formData.seller_closer_id}
                  onChange={(e) => setFormData({ ...formData, seller_closer_id: e.target.value })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...closers.map(c => ({ value: c.id, label: c.name })),
                  ]}
                />
                <Input
                  label="Mentorado que Convidou"
                  value={formData.mentee_inviter}
                  onChange={(e) => setFormData({ ...formData, mentee_inviter: e.target.value })}
                />
                <Input
                  label="Acompanhante"
                  value={formData.companion}
                  onChange={(e) => setFormData({ ...formData, companion: e.target.value })}
                />
                <Select
                  label="Quantas Vezes Foi Chamado"
                  value={formData.times_called.toString()}
                  onChange={(e) => setFormData({ ...formData, times_called: parseInt(e.target.value) })}
                  options={[
                    { value: '0', label: '0' },
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                  ]}
                />
                <Select
                  label="Cor do Participante"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    { value: 'rosa', label: 'Rosa' },
                    { value: 'preto', label: 'Preto' },
                    { value: 'azul_claro', label: 'Azul Claro' },
                    { value: 'dourado', label: 'Dourado' },
                    { value: 'laranja', label: 'Laranja' },
                  ]}
                />
                <Select
                  label="Qualificação (apenas admin)"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    { value: 'super', label: 'Super Qualificado' },
                    { value: 'medio', label: 'Médio Qualificado' },
                    { value: 'baixo', label: 'Baixo Qualificado' },
                  ]}
                />
                <div className="flex items-center pt-6">
                  <Checkbox
                    id="is_opportunity"
                    label="É Oportunidade"
                    checked={formData.is_opportunity}
                    onChange={(e) => setFormData({ ...formData, is_opportunity: e.target.checked })}
                  />
                </div>
              </div>
              <div className="mt-6">
                <Button onClick={handleSave} loading={saving}>
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Legacy Forms (for backwards compatibility) */}
          {forms.length > 0 && forms.some(f => f.completed_at && !hasDiscProfile) && (
            <Card>
              <CardHeader>
                <CardTitle>Formulários Anteriores</CardTitle>
              </CardHeader>
              <CardContent>
                {forms.map((form) => (
                  <div key={form.id} className="border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-500">URL do Formulário:</p>
                        <a
                          href={form.form_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {typeof window !== 'undefined' ? window.location.origin : ''}{form.form_url}
                        </a>
                      </div>
                      {form.disc_profile && (
                        <Badge variant="info" className="text-lg px-4 py-2">
                          {form.disc_profile}
                        </Badge>
                      )}
                    </div>

                    {form.completed_at ? (
                      <div className="space-y-4">
                        {form.disc_description && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Descrição do Perfil</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{form.disc_description}</p>
                          </div>
                        )}
                        {form.sales_insights && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Insights para Vender</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{form.sales_insights}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">Aguardando resposta do participante...</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sales */}
          {sales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Vendas Realizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sales.map((sale) => (
                    <div key={sale.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Produto:</span>
                          <p className="font-medium">{sale.product}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Valor Total:</span>
                          <p className="font-medium">{formatCurrency(sale.total_value)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Valor Entrada:</span>
                          <p className="font-medium">{formatCurrency(sale.entry_value)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Negociação:</span>
                          <p className="font-medium">{sale.negotiation_type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          {/* Archetype Info (Visible to participant) */}
          {participant.primary_archetype && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-800">Arquétipos</CardTitle>
                <p className="text-xs text-purple-600">Visível para o participante</p>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">
                    {getArchetypeIcon(participant.primary_archetype)}
                  </div>
                  <p className="font-bold text-purple-800">{participant.primary_archetype}</p>
                  {participant.secondary_archetype && (
                    <p className="text-sm text-purple-600">
                      + {participant.secondary_archetype} {getArchetypeIcon(participant.secondary_archetype)}
                    </p>
                  )}
                </div>
                {participant.archetype_description && (
                  <p className="text-sm text-gray-600 text-center">
                    {participant.archetype_description}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Closer Atribuído</CardTitle>
            </CardHeader>
            <CardContent>
              {assignedCloser ? (
                <div className="flex items-center gap-3">
                  <Avatar src={assignedCloser.photo_url} alt={assignedCloser.name} />
                  <span className="font-medium">{assignedCloser.name}</span>
                </div>
              ) : (
                <p className="text-gray-500">Nenhum closer atribuído</p>
              )}
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setAssignCloserModal(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {assignedCloser ? 'Alterar Closer' : 'Atribuir Closer'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleGenerateForm}
                loading={formLoading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar Formulário
              </Button>
              <Button
                className="w-full"
                onClick={() => setSaleModal(true)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Venda Realizada
              </Button>
            </CardContent>
          </Card>

          {/* Form Links */}
          {forms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Links de Formulários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {forms.map((form) => (
                  <div key={form.id} className="text-sm">
                    <a
                      href={`/form/${form.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      {form.completed_at ? 'Respondido' : 'Pendente'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Assign Closer Modal */}
      <Modal
        isOpen={assignCloserModal}
        onClose={() => setAssignCloserModal(false)}
        title="Atribuir Closer"
      >
        <div className="space-y-3">
          {closers.map((closer) => (
            <button
              key={closer.id}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              onClick={() => handleAssignCloser(closer.id)}
            >
              <Avatar src={closer.photo_url} alt={closer.name} />
              <span className="font-medium">{closer.name}</span>
              {closer.id === participant.closer_id && (
                <Badge variant="success" className="ml-auto">Atual</Badge>
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Sale Modal */}
      <Modal
        isOpen={saleModal}
        onClose={() => setSaleModal(false)}
        title="Registrar Venda"
      >
        <form onSubmit={handleRegisterSale} className="space-y-4">
          <Input
            label="Produto Vendido"
            value={saleData.product}
            onChange={(e) => setSaleData({ ...saleData, product: e.target.value })}
            required
          />
          <Input
            label="Valor Total do Contrato"
            type="number"
            step="0.01"
            value={saleData.total_value}
            onChange={(e) => setSaleData({ ...saleData, total_value: e.target.value })}
            required
          />
          <Input
            label="Valor de Entrada"
            type="number"
            step="0.01"
            value={saleData.entry_value}
            onChange={(e) => setSaleData({ ...saleData, entry_value: e.target.value })}
            required
          />
          <Input
            label="Forma de Negociação"
            value={saleData.negotiation_type}
            onChange={(e) => setSaleData({ ...saleData, negotiation_type: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setSaleModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              Registrar Venda
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function getArchetypeIcon(archetype: string): string {
  const icons: Record<string, string> = {
    'Inocente': '🌟',
    'Cara Comum': '🤝',
    'Herói': '⚔️',
    'Cuidador': '💝',
    'Explorador': '🧭',
    'Rebelde': '🔥',
    'Amante': '❤️',
    'Criador': '🎨',
    'Bobo da Corte': '🎭',
    'Sábio': '📚',
    'Mago': '✨',
    'Governante': '👑'
  }
  return icons[archetype] || '✨'
}
