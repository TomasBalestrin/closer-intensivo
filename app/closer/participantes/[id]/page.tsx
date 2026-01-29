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
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  MessageSquare,
  ShoppingCart,
  Copy,
  Phone,
  Mail,
  Sparkles,
} from 'lucide-react'
import { Participant, User, Form, Sale } from '@/lib/types'
import { getColorClass, getInstagramUrl, formatCurrency } from '@/lib/utils'

type TabType = 'dados' | 'disc' | 'vendas'

export default function CloserParticipantDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('disc')
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [closers, setClosers] = useState<User[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
  })

  const [saleData, setSaleData] = useState({
    product_name: '',
    total_value: '',
    entry_value: '',
    negotiation_type: '',
  })

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [participantRes, closersRes, formsRes, salesRes] = await Promise.all([
      supabase
        .from('participants')
        .select('*')
        .eq('id', params.id)
        .eq('closer_id', user.id)
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
        closer_id: user.id,
        product_name: saleData.product_name,
        total_value: parseFloat(saleData.total_value),
        entry_value: parseFloat(saleData.entry_value),
        negotiation_type: saleData.negotiation_type,
      })

      if (error) throw error

      showToast('Venda registrada com sucesso', 'success')
      setSaleModal(false)
      setSaleData({
        product_name: '',
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

  const copyFormLink = (formId: string) => {
    const url = `${window.location.origin}/form/${formId}`
    navigator.clipboard.writeText(url)
    showToast('Link copiado!', 'success')
  }

  const getArchetypeIcon = (archetype: string): string => {
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

  // Check if participant has DISC profile data
  const hasDiscProfile = participant?.disc_profile

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
        <p className="text-gray-500">Participante não encontrado ou não atribuído a você</p>
        <Button variant="secondary" onClick={() => router.back()} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  const tabs = [
    { id: 'disc' as TabType, label: 'Análise DISC', icon: Brain },
    { id: 'dados' as TabType, label: 'Dados', icon: FileText },
    { id: 'vendas' as TabType, label: 'Vendas', icon: ShoppingCart },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Participant Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-start gap-4">
            <Avatar src={participant.photo_url} alt={participant.name} size="xl" className="border-4 border-white/30" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{participant.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-white/80 text-sm">
                {participant.niche && (
                  <span className="bg-white/20 px-3 py-1 rounded-full">{participant.niche}</span>
                )}
                {participant.revenue && (
                  <span className="bg-white/20 px-3 py-1 rounded-full">{participant.revenue}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {participant.instagram && (
                  <a
                    href={getInstagramUrl(participant.instagram) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm transition-colors"
                  >
                    @{participant.instagram.replace('@', '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {participant.email && (
                  <a
                    href={`mailto:${participant.email}`}
                    className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm transition-colors"
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </a>
                )}
                {participant.phone && (
                  <a
                    href={`https://wa.me/${participant.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-green-500/80 hover:bg-green-500 px-3 py-1 rounded-full text-sm transition-colors"
                  >
                    <Phone className="h-3 w-3" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
            {/* Archetypes Badge */}
            {participant.primary_archetype && (
              <div className="text-center bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-3xl mb-1">{getArchetypeIcon(participant.primary_archetype)}</div>
                <p className="font-semibold text-sm">{participant.primary_archetype}</p>
                {participant.secondary_archetype && (
                  <p className="text-xs text-white/70">+ {participant.secondary_archetype}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'disc' && hasDiscProfile && (
                  <Badge variant="info" className="ml-1">{participant.disc_profile}</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* DISC Tab */}
      {activeTab === 'disc' && (
        <div className="space-y-6">
          {!hasDiscProfile ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Análise DISC não disponível</p>
                <Button onClick={handleGenerateForm} loading={formLoading}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Formulário
                </Button>
                {forms.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-gray-400">Links de formulário:</p>
                    {forms.map((form) => (
                      <div key={form.id} className="flex items-center justify-center gap-2">
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                          /form/{form.id}
                        </span>
                        <button
                          onClick={() => copyFormLink(form.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Main Profile Grid - Archetype + DISC side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Perfil de Arquétipo */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                      <Sparkles className="h-5 w-5" />
                      Perfil de Arquétipo
                    </CardTitle>
                    {participant.form_completed_at && (
                      <p className="text-sm text-gray-500">
                        Avaliação em {new Date(participant.form_completed_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Top 3 Archetypes */}
                    <div className="space-y-2">
                      {/* 1st Place */}
                      {participant.primary_archetype && (
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 bg-purple-600 text-white rounded-full text-xs font-bold">
                              1º
                            </span>
                            <span className="text-lg font-semibold text-purple-700">
                              {getArchetypeIcon(participant.primary_archetype)} {participant.primary_archetype}
                            </span>
                          </div>
                          <span className="text-xl font-bold text-purple-600">
                            {(participant.archetype_scores as Record<string, number> | null)?.[participant.primary_archetype] || '-'}
                          </span>
                        </div>
                      )}

                      {/* 2nd Place */}
                      {participant.secondary_archetype && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 bg-gray-400 text-white rounded-full text-xs font-bold">
                              2º
                            </span>
                            <span className="font-medium text-gray-700">
                              {getArchetypeIcon(participant.secondary_archetype)} {participant.secondary_archetype}
                            </span>
                          </div>
                          <span className="text-lg font-bold text-gray-600">
                            {(participant.archetype_scores as Record<string, number> | null)?.[participant.secondary_archetype] || '-'}
                          </span>
                        </div>
                      )}

                      {/* 3rd Place - find from archetype_scores */}
                      {participant.archetype_scores && (() => {
                        const scores = participant.archetype_scores as Record<string, number>
                        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
                        const third = sorted[2]
                        if (third) {
                          return (
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-6 h-6 bg-gray-300 text-white rounded-full text-xs font-bold">
                                  3º
                                </span>
                                <span className="font-medium text-gray-600">
                                  {getArchetypeIcon(third[0])} {third[0]}
                                </span>
                              </div>
                              <span className="text-lg font-bold text-gray-500">{third[1]}</span>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>

                    {/* All Archetypes Grid */}
                    {participant.archetype_scores && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Todos os Arquétipos</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {Object.entries(participant.archetype_scores as Record<string, number>)
                            .sort((a, b) => b[1] - a[1])
                            .map(([name, score]) => (
                              <div key={name} className="flex justify-between py-1 border-b border-gray-100">
                                <span className="text-gray-600">{name}</span>
                                <span className="font-semibold text-gray-800">{score}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Perfil DISC */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Perfil DISC
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Main DISC Profile Badge */}
                    {(() => {
                      const discColors: Record<string, { bg: string; badge: string; name: string; desc: string }> = {
                        'D': { bg: 'bg-red-50 border-red-200', badge: 'bg-red-500', name: 'Dominância', desc: 'Executor Determinado' },
                        'I': { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-500', name: 'Influência', desc: 'Comunicador Expressivo' },
                        'S': { bg: 'bg-green-50 border-green-200', badge: 'bg-green-500', name: 'Estabilidade', desc: 'Apoiador Consistente' },
                        'C': { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-500', name: 'Conformidade', desc: 'Analítico Preciso' },
                      }
                      const profile = participant.disc_profile || 'D'
                      const mainLetter = profile.charAt(0)
                      const config = discColors[mainLetter] || discColors['D']

                      return (
                        <div className={`p-4 rounded-lg border-2 ${config.bg}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-4xl font-bold text-gray-800">{mainLetter}</span>
                            <span className={`${config.badge} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                              {config.name}
                            </span>
                          </div>
                          <p className="text-gray-700 font-medium">{config.desc}</p>
                        </div>
                      )
                    })()}

                    {/* DISC Bars */}
                    <div className="space-y-3">
                      {[
                        { label: 'D', value: participant.disc_score_d, color: 'bg-red-500', name: 'Dominância' },
                        { label: 'I', value: participant.disc_score_i, color: 'bg-yellow-500', name: 'Influência' },
                        { label: 'S', value: participant.disc_score_s, color: 'bg-green-500', name: 'Estabilidade' },
                        { label: 'C', value: participant.disc_score_c, color: 'bg-blue-500', name: 'Conformidade' },
                      ].map((score) => {
                        const percentage = ((score.value || 0) / 10) * 100
                        return (
                          <div key={score.label}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">{score.label} - {score.name}</span>
                              <span className="font-semibold">{Math.round(percentage)}%</span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${score.color} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Quick Tip - Dica de Abordagem */}
                    {participant.quick_tips && participant.quick_tips.length > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                          <Lightbulb className="h-4 w-4" />
                          Dica de Abordagem
                        </div>
                        <p className="text-green-700 text-sm">{participant.quick_tips[0]}</p>
                      </div>
                    )}

                    {/* Alert - Things to Avoid */}
                    {participant.things_to_avoid && participant.things_to_avoid.length > 0 && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700 font-semibold mb-1">
                          <AlertTriangle className="h-4 w-4" />
                          Alertas
                        </div>
                        <p className="text-amber-700 text-sm">{participant.things_to_avoid[0]}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Additional Info Below */}
              {/* Personality Summary */}
              {participant.personality_summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                      Resumo da Personalidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{participant.personality_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Open Answers */}
              {(participant.challenge_answer || participant.desired_change_answer) && (
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                      <Sparkles className="h-5 w-5" />
                      O Que o Participante Disse
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {participant.challenge_answer && (
                      <div>
                        <p className="text-sm text-amber-700 font-medium mb-1">Maior desafio:</p>
                        <p className="text-gray-700 italic bg-white/80 p-3 rounded-lg border border-amber-200">
                          &ldquo;{participant.challenge_answer}&rdquo;
                        </p>
                      </div>
                    )}
                    {participant.desired_change_answer && (
                      <div>
                        <p className="text-sm text-amber-700 font-medium mb-1">Mudança desejada:</p>
                        <p className="text-gray-700 italic bg-white/80 p-3 rounded-lg border border-amber-200">
                          &ldquo;{participant.desired_change_answer}&rdquo;
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* All Quick Tips */}
              {participant.quick_tips && participant.quick_tips.length > 1 && (
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Lightbulb className="h-5 w-5" />
                      Todas as Dicas de Abordagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {participant.quick_tips.map((tip: string, i: number) => (
                        <li key={i} className="text-green-700 flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Decision Triggers */}
              {participant.decision_triggers && Array.isArray(participant.decision_triggers) && participant.decision_triggers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-orange-600" />
                      Gatilhos de Decisão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(participant.decision_triggers as string[]).map((trigger: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Predicted Objections */}
              {participant.predicted_objections && Array.isArray(participant.predicted_objections) && participant.predicted_objections.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Objeções Previstas + Scripts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(participant.predicted_objections as Array<{objection: string; script: string}>).map((obj, i: number) => (
                        <div key={i} className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50 rounded-r-lg">
                          <p className="font-medium text-amber-800">&ldquo;{obj.objection}&rdquo;</p>
                          <p className="text-gray-600 text-sm mt-2">
                            <span className="font-semibold text-green-700">Resposta: </span>
                            {obj.script}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Closing Strategies */}
              {participant.closing_strategies && Array.isArray(participant.closing_strategies) && participant.closing_strategies.length > 0 && (
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      Estratégias de Fechamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(participant.closing_strategies as Array<{name: string; script: string}>).map((strategy, i: number) => (
                        <div key={i} className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <p className="font-semibold text-green-800 mb-2">{strategy.name}</p>
                          <p className="text-green-700 text-sm italic">&ldquo;{strategy.script}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Things to Avoid */}
              {participant.things_to_avoid && participant.things_to_avoid.length > 1 && (
                <Card className="border-red-200 bg-red-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-800">
                      <XCircle className="h-5 w-5" />
                      O Que Evitar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {participant.things_to_avoid.map((item: string, i: number) => (
                        <li key={i} className="text-red-700 flex items-start gap-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Dados Tab */}
      {activeTab === 'dados' && (
        <div className="space-y-6">
          {/* Participant Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Participante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Credenciou Dia 1:</span>
                  <p className={participant.checked_in_day1 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    {participant.checked_in_day1 ? 'Sim' : 'Não'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Credenciou Dia 2:</span>
                  <p className={participant.checked_in_day2 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    {participant.checked_in_day2 ? 'Sim' : 'Não'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Credenciou Dia 3:</span>
                  <p className={participant.checked_in_day3 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    {participant.checked_in_day3 ? 'Sim' : 'Não'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Vezes Chamado:</span>
                  <p className="font-medium">{participant.times_called || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
        </div>
      )}

      {/* Vendas Tab */}
      {activeTab === 'vendas' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Vendas Realizadas</h2>
            <Button onClick={() => setSaleModal(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Registrar Venda
            </Button>
          </div>

          {sales.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma venda registrada</p>
                <Button className="mt-4" onClick={() => setSaleModal(true)}>
                  Registrar Primeira Venda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <Card key={sale.id}>
                  <CardContent className="py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm text-gray-500">Produto</span>
                        <p className="font-medium">{sale.product_name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Valor Total</span>
                        <p className="font-medium text-green-600">{formatCurrency(sale.total_value)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Entrada</span>
                        <p className="font-medium">{formatCurrency(sale.entry_value)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Negociação</span>
                        <p className="font-medium">{sale.negotiation_type}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Sales Summary */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-green-600">Total Vendas</p>
                      <p className="text-2xl font-bold text-green-700">{sales.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Valor Total</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(sales.reduce((sum, s) => sum + Number(s.total_value), 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Total Entradas</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(sales.reduce((sum, s) => sum + Number(s.entry_value), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Sale Modal */}
      <Modal
        isOpen={saleModal}
        onClose={() => setSaleModal(false)}
        title="Registrar Venda"
      >
        <form onSubmit={handleRegisterSale} className="space-y-4">
          <Input
            label="Produto Vendido"
            value={saleData.product_name}
            onChange={(e) => setSaleData({ ...saleData, product_name: e.target.value })}
            required
          />
          <Input
            label="Valor Total do Contrato (R$)"
            type="number"
            step="0.01"
            placeholder="0,00"
            value={saleData.total_value}
            onChange={(e) => setSaleData({ ...saleData, total_value: e.target.value })}
            required
          />
          <Input
            label="Valor de Entrada (R$)"
            type="number"
            step="0.01"
            placeholder="0,00"
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
