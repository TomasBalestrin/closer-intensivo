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
  MessageSquare,
  User,
  ShoppingCart,
  Zap,
  Copy,
  RefreshCw,
} from 'lucide-react'
import { Participant, User as UserType, Form, Sale } from '@/lib/types'
import { getColorClass, getInstagramUrl, formatCurrency, formatDateBR } from '@/lib/utils'

type TabType = 'dados' | 'vendas' | 'disc' | 'acoes'

export default function ParticipantDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('dados')
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [closers, setClosers] = useState<UserType[]>([])
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
    cpf: '',
    badge_name: '',
    net_profit: '',
    partner: '',
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
      supabase.from('participants').select('*').eq('id', params.id).single(),
      supabase.from('users').select('*').eq('role', 'closer'),
      supabase.from('disc_forms').select('*').eq('participant_id', params.id),
      supabase.from('sales').select('*, closer:users(*)').eq('participant_id', params.id),
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
        cpf: participantRes.data.cpf || '',
        badge_name: participantRes.data.badge_name || '',
        net_profit: participantRes.data.net_profit || '',
        partner: participantRes.data.partner || '',
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
          cpf: formData.cpf || null,
          badge_name: formData.badge_name || null,
          net_profit: formData.net_profit || null,
          partner: formData.partner || null,
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
      setSaleData({ product: '', total_value: '', entry_value: '', negotiation_type: '' })
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

  const handleReprocessAnalysis = async (form: any) => {
    if (!participant) return
    setFormLoading(true)
    try {
      // Get the form data
      const answers = form.answers || {}

      // Call the analysis API
      const response = await fetch('/api/forms/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          answers,
          challengeAnswer: participant.challenge_answer || '',
          desiredChangeAnswer: participant.desired_change_answer || '',
        }),
      })

      if (!response.ok) {
        throw new Error('Erro na análise')
      }

      showToast('Análise reprocessada com sucesso', 'success')
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao reprocessar análise', 'error')
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
  const completedForms = forms.filter((f: any) => f.completed_at != null)
  const hasCompletedForms = completedForms.length > 0

  const tabs = [
    { id: 'dados' as TabType, label: 'Dados', icon: User },
    { id: 'vendas' as TabType, label: 'Vendas', icon: ShoppingCart, count: sales.length },
    { id: 'disc' as TabType, label: 'DISC', icon: Brain, badge: participant.disc_profile },
    { id: 'acoes' as TabType, label: 'Ações', icon: Zap },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <Avatar src={participant.photo_url} alt={participant.name} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{participant.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {participant.is_opportunity && <Badge variant="success">Oportunidade</Badge>}
                {hasDiscProfile && <Badge variant="info">DISC: {participant.disc_profile}</Badge>}
                {participant.qualification && (
                  <Badge variant={participant.qualification === 'super' ? 'success' : participant.qualification === 'medio' ? 'warning' : 'danger'}>
                    {participant.qualification === 'super' ? 'Super' : participant.qualification === 'medio' ? 'Médio' : 'Baixo'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* DADOS TAB */}
        {activeTab === 'dados' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Webhook Data */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Participante</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Faturamento:</span>
                      <p className="font-medium">{participant.revenue || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Nicho:</span>
                      <p className="font-medium">{participant.niche || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      {participant.email ? (
                        <a
                          href={`mailto:${participant.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {participant.email}
                        </a>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">WhatsApp:</span>
                      {participant.phone ? (
                        <a
                          href={`https://wa.me/${participant.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {participant.phone}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Instagram:</span>
                      {participant.instagram ? (
                        <a
                          href={getInstagramUrl(participant.instagram) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {participant.instagram}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Check-in Dia 1:</span>
                      <p className={participant.checked_in_day1 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {participant.checked_in_day1 ? 'Sim' : 'Não'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Check-in Dia 2:</span>
                      <p className={participant.checked_in_day2 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {participant.checked_in_day2 ? 'Sim' : 'Não'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Check-in Dia 3:</span>
                      <p className={participant.checked_in_day3 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {participant.checked_in_day3 ? 'Sim' : 'Não'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">CPF:</span>
                      <p className="font-medium">{participant.cpf || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Nome no Crachá:</span>
                      <p className="font-medium">{participant.badge_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Lucro Líquido:</span>
                      <p className="font-medium">{participant.net_profit || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Sócio:</span>
                      <p className="font-medium">{participant.partner || '-'}</p>
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
                      label="Vezes Chamado"
                      value={formData.times_called.toString()}
                      onChange={(e) => setFormData({ ...formData, times_called: parseInt(e.target.value) })}
                      options={[0,1,2,3,4].map(n => ({ value: n.toString(), label: n.toString() }))}
                    />
                    <Select
                      label="Cor"
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
                      label="Qualificação"
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
                    <Input
                      label="CPF"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                    <Input
                      label="Nome no Crachá"
                      value={formData.badge_name}
                      onChange={(e) => setFormData({ ...formData, badge_name: e.target.value })}
                    />
                    <Input
                      label="Lucro Líquido"
                      value={formData.net_profit}
                      onChange={(e) => setFormData({ ...formData, net_profit: e.target.value })}
                      placeholder="R$ 0.000,00"
                    />
                    <Input
                      label="Sócio"
                      value={formData.partner}
                      onChange={(e) => setFormData({ ...formData, partner: e.target.value })}
                    />
                  </div>
                  <div className="mt-6">
                    <Button onClick={handleSave} loading={saving}>
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
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
                  <Button variant="secondary" className="w-full mt-4" onClick={() => setAssignCloserModal(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {assignedCloser ? 'Alterar' : 'Atribuir'} Closer
                  </Button>
                </CardContent>
              </Card>

              {participant.primary_archetype && (
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-purple-800">Arquétipos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl mb-2">{getArchetypeIcon(participant.primary_archetype)}</div>
                      <p className="font-bold text-purple-800">{participant.primary_archetype}</p>
                      {participant.secondary_archetype && (
                        <p className="text-sm text-purple-600">+ {participant.secondary_archetype}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* VENDAS TAB */}
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
                {sales.map((sale: any) => (
                  <Card key={sale.id}>
                    <CardContent className="py-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Produto</span>
                          <p className="font-medium">{sale.product}</p>
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
                        <div>
                          <span className="text-sm text-gray-500">Closer</span>
                          <p className="font-medium">{sale.closer?.name || '-'}</p>
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

        {/* DISC TAB */}
        {activeTab === 'disc' && (
          <div className="space-y-6">
            {/* No DISC profile and no completed forms - show generate button */}
            {!hasDiscProfile && !hasCompletedForms && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Formulário DISC não preenchido</p>
                  <Button onClick={handleGenerateForm} loading={formLoading}>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Formulário
                  </Button>
                  {forms.length > 0 && (
                    <p className="text-xs text-gray-400 mt-4">
                      {forms.length} formulário(s) pendente(s) de resposta
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* No DISC profile but has completed forms - show reprocess option */}
            {!hasDiscProfile && hasCompletedForms && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 text-amber-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-2">Formulário respondido, mas análise não processada</p>
                  <p className="text-gray-500 text-sm mb-4">
                    O participante respondeu o formulário, mas os dados DISC não foram gerados.
                  </p>
                  <Button onClick={() => handleReprocessAnalysis(completedForms[0])} loading={formLoading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reprocessar Análise
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Has DISC profile - show DISC data */}
            {hasDiscProfile && (
              <>
                {/* DISC Scores */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Perfil DISC: {participant.disc_profile}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

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
                  <Card>
                    <CardHeader>
                      <CardTitle>Respostas Abertas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {participant.challenge_answer && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Maior desafio:</p>
                          <p className="text-gray-700 italic bg-gray-50 p-3 rounded-lg">&ldquo;{participant.challenge_answer}&rdquo;</p>
                        </div>
                      )}
                      {participant.desired_change_answer && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Mudança desejada:</p>
                          <p className="text-gray-700 italic bg-gray-50 p-3 rounded-lg">&ldquo;{participant.desired_change_answer}&rdquo;</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Quick Tips */}
                {participant.quick_tips && participant.quick_tips.length > 0 && (
                  <Card className="border-green-200 bg-green-50/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <Lightbulb className="h-5 w-5" />
                        Dicas Rápidas
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
                          <span key={i} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
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
                          <div key={i} className="border-l-4 border-amber-400 pl-4 py-2">
                            <p className="font-medium text-amber-800">&ldquo;{obj.objection}&rdquo;</p>
                            <p className="text-gray-600 text-sm mt-1">
                              <span className="font-medium text-gray-700">Resposta: </span>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Estratégias de Fechamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(participant.closing_strategies as Array<{name: string; script: string}>).map((strategy, i: number) => (
                          <div key={i} className="bg-green-50 rounded-lg p-3">
                            <p className="font-medium text-green-800">{strategy.name}</p>
                            <p className="text-green-700 text-sm mt-1">&ldquo;{strategy.script}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Things to Avoid */}
                {participant.things_to_avoid && participant.things_to_avoid.length > 0 && (
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

        {/* AÇÕES TAB */}
        {activeTab === 'acoes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Formulário DISC</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" variant="secondary" onClick={handleGenerateForm} loading={formLoading}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Novo Formulário
                </Button>

                {forms.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-3">Formulários existentes:</p>
                    <div className="space-y-3">
                      {forms.map((form) => (
                        <div key={form.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={form.completed_at ? 'success' : 'warning'}>
                              {form.completed_at ? 'Respondido' : 'Aguardando resposta'}
                            </Badge>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => copyFormLink(form.id)} title="Copiar link">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <a href={`/form/${form.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" title="Abrir formulário">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </a>
                            </div>
                          </div>
                          {!form.completed_at && (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={typeof window !== 'undefined' ? `${window.location.origin}/form/${form.id}` : `/form/${form.id}`}
                                className="flex-1 text-xs p-2 bg-white border rounded text-gray-600 font-mono"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                              />
                              <Button size="sm" onClick={() => copyFormLink(form.id)}>
                                Copiar
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Closer</CardTitle>
              </CardHeader>
              <CardContent>
                {assignedCloser ? (
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar src={assignedCloser.photo_url} alt={assignedCloser.name} size="lg" />
                    <div>
                      <p className="font-medium">{assignedCloser.name}</p>
                      <p className="text-sm text-gray-500">{assignedCloser.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 mb-4">Nenhum closer atribuído</p>
                )}
                <Button className="w-full" variant="secondary" onClick={() => setAssignCloserModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {assignedCloser ? 'Alterar' : 'Atribuir'} Closer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-green-600">{sales.length}</p>
                  <p className="text-sm text-gray-500">vendas registradas</p>
                </div>
                <Button className="w-full" onClick={() => setSaleModal(true)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Registrar Venda
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Links Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {participant.instagram && (
                  <a
                    href={getInstagramUrl(participant.instagram) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-blue-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Instagram: {participant.instagram}
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={assignCloserModal} onClose={() => setAssignCloserModal(false)} title="Atribuir Closer">
        <div className="space-y-3">
          {closers.map((closer) => (
            <button
              key={closer.id}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              onClick={() => handleAssignCloser(closer.id)}
            >
              <Avatar src={closer.photo_url} alt={closer.name} />
              <span className="font-medium">{closer.name}</span>
              {closer.id === participant.closer_id && <Badge variant="success" className="ml-auto">Atual</Badge>}
            </button>
          ))}
        </div>
      </Modal>

      <Modal isOpen={saleModal} onClose={() => setSaleModal(false)} title="Registrar Venda">
        <form onSubmit={handleRegisterSale} className="space-y-4">
          <Input label="Produto Vendido" value={saleData.product} onChange={(e) => setSaleData({ ...saleData, product: e.target.value })} required />
          <Input label="Valor Total" type="number" step="0.01" value={saleData.total_value} onChange={(e) => setSaleData({ ...saleData, total_value: e.target.value })} required />
          <Input label="Valor Entrada" type="number" step="0.01" value={saleData.entry_value} onChange={(e) => setSaleData({ ...saleData, entry_value: e.target.value })} required />
          <Input label="Negociação" value={saleData.negotiation_type} onChange={(e) => setSaleData({ ...saleData, negotiation_type: e.target.value })} required />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setSaleModal(false)}>Cancelar</Button>
            <Button type="submit" loading={formLoading}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function getArchetypeIcon(archetype: string): string {
  const icons: Record<string, string> = {
    'Inocente': '🌟', 'Cara Comum': '🤝', 'Herói': '⚔️', 'Cuidador': '💝',
    'Explorador': '🧭', 'Rebelde': '🔥', 'Amante': '❤️', 'Criador': '🎨',
    'Bobo da Corte': '🎭', 'Sábio': '📚', 'Mago': '✨', 'Governante': '👑'
  }
  return icons[archetype] || '✨'
}
