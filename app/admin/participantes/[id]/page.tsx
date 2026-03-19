'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Pencil,
  Trash2,
  Sparkles,
  Users,
  Check,
  Loader2,
  Phone,
  PhoneCall,
  Mail,
  Code,
} from 'lucide-react'
import { Participant, User as UserType, Form, Sale } from '@/lib/types'
import { getColorClass, getInstagramUrl, formatCurrency, formatDateBR, FATURAMENTO_OPTIONS, getColorFromRevenue, getQualificationFromRevenue, FUNIL_OPTIONS, getQualificationClass, normalizeRevenue, formatColorLabel, formatStatusLabel, getStatusClass, formatQualificationLabel, formatCurrencyInput, parseCurrency } from '@/lib/utils'

type TabType = 'perfil' | 'disc' | 'vendas'

export default function ParticipantDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('perfil')
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [closers, setClosers] = useState<UserType[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [assignCloserModal, setAssignCloserModal] = useState(false)
  const [saleModal, setSaleModal] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [checkinSaving, setCheckinSaving] = useState<number | null>(null)
  const [allParticipants, setAllParticipants] = useState<Array<{ id: string; name: string }>>([])

  const [formData, setFormData] = useState({
    funnel: '',
    seller_closer_id: '',
    seller_closer_other: '',
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
    revenue: '',
    notes: '',
  })

  const [saleData, setSaleData] = useState({
    product_name: '',
    total_value: '',
    entry_value: '',
    valor_proxima_semana: '',
    negotiation_type: '',
    dia_evento: '',
    observacoes: '',
    closer_id: '',
  })

  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null)
  const [deleteParticipantModal, setDeleteParticipantModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [chamadoSaving, setChamadoSaving] = useState(false)
  const [editingChamados, setEditingChamados] = useState(false)
  const [chamadosInput, setChamadosInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [eventData, setEventData] = useState<{ id: string; data_inicio: string } | null>(null)

  // Check if event is from March 2026 onwards (new interface)
  const isNewInterface = eventData?.data_inicio ? new Date(eventData.data_inicio) >= new Date('2026-03-01') : false

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    setLoading(true)

    const [participantRes, formsRes, salesRes] = await Promise.all([
      supabase.from('participants').select('*, event:events(id, data_inicio)').eq('id', params.id).single(),
      supabase.from('disc_forms').select('*').eq('participant_id', params.id),
      supabase.from('sales').select('*, closer:users(*)').eq('participant_id', params.id).is('deleted_at', null),
    ])

    if (participantRes.data) {
      // Set event data for interface versioning
      const eventInfo = (participantRes.data as any).event
      if (eventInfo) {
        setEventData({ id: eventInfo.id, data_inicio: eventInfo.data_inicio })
      }

      // Hydrate analysis data from webhook_data if individual columns are missing
      let p = participantRes.data
      if (!p.disc_profile && p.webhook_data) {
        const wd = p.webhook_data as any
        if (wd.disc?.profile) {
          p = {
            ...p,
            disc_profile: wd.disc.profile,
            disc_score_d: wd.disc.scores?.D,
            disc_score_i: wd.disc.scores?.I,
            disc_score_s: wd.disc.scores?.S,
            disc_score_c: wd.disc.scores?.C,
            primary_archetype: wd.archetypes?.primary,
            secondary_archetype: wd.archetypes?.secondary,
            archetype_description: wd.archetypes?.description,
            disc_analysis: wd.disc_analysis,
            personality_summary: wd.salesAnalysis?.personality_summary,
            behavioral_profile: wd.salesAnalysis?.behavioral_profile,
            archetype_disc_combo: wd.salesAnalysis?.archetype_disc_combo,
            how_to_approach: wd.salesAnalysis?.how_to_approach,
            communication_style: wd.salesAnalysis?.communication_style,
            sales_approach: wd.salesAnalysis?.sales_approach,
            decision_triggers: wd.salesAnalysis?.decision_triggers,
            predicted_objections: wd.salesAnalysis?.predicted_objections,
            closing_strategies: wd.salesAnalysis?.closing_strategies,
            things_to_avoid: wd.salesAnalysis?.things_to_avoid,
            quick_tips: wd.salesAnalysis?.quick_tips,
            challenge_answer: wd.challengeAnswer,
            desired_change_answer: wd.desiredChangeAnswer,
          }
        }
      }
      setParticipant(p)
      const normalizedRev = normalizeRevenue(p.revenue) || ''
      setFormData({
        funnel: p.funnel || '',
        seller_closer_id: p.seller_closer_id || '',
        seller_closer_other: (p as any).seller_closer_other || '',
        mentee_inviter: p.mentee_inviter || '',
        companion: p.companion || '',
        is_opportunity: p.is_opportunity,
        times_called: p.times_called,
        color: getColorFromRevenue(normalizedRev) || p.color || '',
        qualification: getQualificationFromRevenue(normalizedRev) || p.qualification || '',
        cpf: p.cpf || '',
        badge_name: p.badge_name || '',
        net_profit: p.net_profit || '',
        partner: p.partner || '',
        revenue: normalizedRev,
        notes: p.notes || '',
      })
    }

    // Fetch closers filtered by participant's event
    const participantEventId = participantRes.data?.event_id
    let closersData: UserType[] = []
    if (participantEventId) {
      const { data: userEventsData } = await supabase
        .from('user_events')
        .select('user_id')
        .eq('event_id', participantEventId)
        .eq('role', 'closer')
      if (userEventsData && userEventsData.length > 0) {
        const userIds = userEventsData.map((ue: any) => ue.user_id)
        const { data } = await supabase.from('users').select('*').in('id', userIds)
        closersData = (data || []) as UserType[]
      }
    } else {
      const { data } = await supabase.from('users').select('*').eq('role', 'closer')
      closersData = (data || []) as UserType[]
    }

    setClosers(closersData)
    setForms(formsRes.data || [])
    setSales(salesRes.data || [])

    // Fetch all participants for companion name lookup
    const { data: allParts } = await supabase
      .from('participants')
      .select('id, name')
    setAllParticipants(allParts || [])

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Auto-calculate color and qualification from revenue
      const autoColor = getColorFromRevenue(formData.revenue) || formData.color || null
      const autoQualification = getQualificationFromRevenue(formData.revenue) || formData.qualification || null

      const { error } = await supabase
        .from('participants')
        .update({
          funnel: formData.funnel || null,
          seller_closer_id: formData.seller_closer_id === 'outros' ? null : (formData.seller_closer_id || null),
          mentee_inviter: formData.mentee_inviter || null,
          companion: formData.companion || null,
          is_opportunity: formData.is_opportunity,
          times_called: formData.times_called,
          color: autoColor,
          qualification: autoQualification,
          cpf: formData.cpf || null,
          badge_name: formData.badge_name || null,
          net_profit: formData.net_profit || null,
          partner: formData.partner || null,
          revenue: formData.revenue || null,
          notes: formData.notes || null,
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

  const handleToggleCheckin = async (day: number) => {
    if (!participant) return
    setCheckinSaving(day)
    try {
      const field = `checked_in_day${day}` as keyof Participant
      const currentValue = participant[field] as boolean
      const { error } = await supabase
        .from('participants')
        .update({ [field]: !currentValue })
        .eq('id', params.id)

      if (error) throw error

      setParticipant({ ...participant, [field]: !currentValue })
      showToast(
        !currentValue
          ? `Check-in Dia ${day} marcado com sucesso`
          : `Check-in Dia ${day} desmarcado`,
        'success'
      )
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar check-in', 'error')
    } finally {
      setCheckinSaving(null)
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

  const generateShortCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleGenerateForm = async () => {
    setFormLoading(true)
    try {
      const formId = crypto.randomUUID()
      const shortCode = generateShortCode()
      const { error } = await supabase.from('disc_forms').insert({
        id: formId,
        participant_id: params.id as string,
        answers: {},
        short_code: shortCode,
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

      const closerIdForSale = saleData.closer_id || participant?.closer_id || user.id

      // Get closer name
      const { data: closerData } = await supabase
        .from('users')
        .select('name')
        .eq('id', closerIdForSale)
        .single()

      const { error } = await supabase.from('sales').insert({
        participant_id: params.id as string,
        closer_id: closerIdForSale,
        closer_nome: closerData?.name || null,
        product_name: saleData.product_name,
        amount: parseCurrency(saleData.total_value),
        total_value: parseCurrency(saleData.total_value),
        entry_value: parseCurrency(saleData.entry_value),
        valor_proxima_semana: saleData.valor_proxima_semana ? parseCurrency(saleData.valor_proxima_semana) : 0,
        negotiation_type: saleData.negotiation_type,
        dia_evento: saleData.dia_evento ? parseInt(saleData.dia_evento) : null,
        observacoes: saleData.observacoes || null,
        event_id: participant?.event_id || null,
      })

      if (error) throw error
      showToast('Venda registrada com sucesso', 'success')
      setSaleModal(false)
      setSaleData({ product_name: '', total_value: '', entry_value: '', valor_proxima_semana: '', negotiation_type: '', dia_evento: '', observacoes: '', closer_id: '' })
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao registrar venda', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale)
    setSaleData({
      product_name: sale.product_name || '',
      total_value: sale.total_value ? formatCurrency(Number(sale.total_value)) : '',
      entry_value: sale.entry_value ? formatCurrency(Number(sale.entry_value)) : '',
      valor_proxima_semana: sale.valor_proxima_semana ? formatCurrency(Number(sale.valor_proxima_semana)) : '',
      negotiation_type: sale.negotiation_type || '',
      dia_evento: sale.dia_evento?.toString() || '',
      observacoes: sale.observacoes || '',
      closer_id: sale.closer_id || participant?.closer_id || '',
    })
    setSaleModal(true)
  }

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSale) return

    setFormLoading(true)
    try {
      const updateData: any = {
        product_name: saleData.product_name,
        amount: parseCurrency(saleData.total_value),
        total_value: parseCurrency(saleData.total_value),
        entry_value: parseCurrency(saleData.entry_value),
        valor_proxima_semana: saleData.valor_proxima_semana ? parseCurrency(saleData.valor_proxima_semana) : 0,
        negotiation_type: saleData.negotiation_type,
        dia_evento: saleData.dia_evento ? parseInt(saleData.dia_evento) : null,
        observacoes: saleData.observacoes || null,
      }
      if (saleData.closer_id) {
        updateData.closer_id = saleData.closer_id
        // Get updated closer name
        const { data: closerData } = await supabase
          .from('users')
          .select('name')
          .eq('id', saleData.closer_id)
          .single()
        updateData.closer_nome = closerData?.name || null
      }
      const { error } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', editingSale.id)

      if (error) throw error
      showToast('Venda atualizada com sucesso', 'success')
      setSaleModal(false)
      setEditingSale(null)
      setSaleData({ product_name: '', total_value: '', entry_value: '', valor_proxima_semana: '', negotiation_type: '', dia_evento: '', observacoes: '', closer_id: '' })
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar venda', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteSale = async () => {
    if (!deletingSale) return

    setFormLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Soft delete - mark as deleted instead of removing
      const { error } = await supabase
        .from('sales')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          motivo_remocao: 'Removido pelo administrador',
        })
        .eq('id', deletingSale.id)

      if (error) throw error
      showToast('Venda removida com sucesso', 'success')
      setDeletingSale(null)
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao remover venda', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleCloseSaleModal = () => {
    setSaleModal(false)
    setEditingSale(null)
    setSaleData({ product_name: '', total_value: '', entry_value: '', valor_proxima_semana: '', negotiation_type: '', dia_evento: '', observacoes: '', closer_id: '' })
  }

  const handleMarcarChamado = async () => {
    setChamadoSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase
        .from('participants')
        .update({
          chamado: true,
          chamado_at: new Date().toISOString(),
          chamado_by: user.id,
          times_called: (participant?.times_called || 0) + 1,
        })
        .eq('id', params.id)

      if (error) throw error

      showToast('Participante marcado como chamado!', 'success')
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao marcar como chamado', 'error')
    } finally {
      setChamadoSaving(false)
    }
  }

  const handleSaveChamados = async (value: number) => {
    setChamadoSaving(true)
    try {
      const { error } = await supabase
        .from('participants')
        .update({ times_called: value })
        .eq('id', params.id)

      if (error) throw error
      showToast('Chamados atualizado!', 'success')
      setEditingChamados(false)
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar chamados', 'error')
    } finally {
      setChamadoSaving(false)
    }
  }

  const handleDeleteParticipant = async () => {
    setDeleting(true)
    try {
      // Delete related records first (sales, disc_forms), then the participant
      const participantId = params.id as string

      // Delete sales
      await supabase.from('sales').delete().eq('participant_id', participantId)
      // Delete disc_forms
      await supabase.from('disc_forms').delete().eq('participant_id', participantId)
      // Delete participant
      const { error } = await supabase.from('participants').delete().eq('id', participantId)

      if (error) throw error
      showToast('Participante excluído com sucesso', 'success')
      router.push('/admin/participantes')
    } catch (error: any) {
      showToast(error.message || 'Erro ao excluir participante', 'error')
    } finally {
      setDeleting(false)
      setDeleteParticipantModal(false)
    }
  }

  const getFormCode = (form: any) => form.short_code || form.id

  const copyFormLink = (form: any) => {
    const code = getFormCode(form)
    const url = `${window.location.origin}/form/${code}`
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

  // Try to find a matching participant for the companion field
  const companionMatch = useMemo(() => {
    if (!participant?.companion || allParticipants.length === 0) return null
    const raw = participant.companion.trim()
    const nameOnly = raw.replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase()
    if (!nameOnly) return null
    const exact = allParticipants.find(
      p => p.id !== participant.id && p.name.toLowerCase() === nameOnly
    )
    if (exact) return exact
    const partial = allParticipants.find(
      p => p.id !== participant.id && (
        p.name.toLowerCase().includes(nameOnly) ||
        nameOnly.includes(p.name.toLowerCase())
      )
    )
    return partial || null
  }, [participant?.companion, participant?.id, allParticipants])

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
  // Check if form is truly completed (has completed_at AND has actual answers)
  const completedForms = forms.filter((f: any) => f.completed_at != null && f.answers && Object.keys(f.answers).length > 0)
  const hasCompletedForms = completedForms.length > 0
  const pendingForms = forms.filter((f: any) => !f.completed_at || !f.answers || Object.keys(f.answers).length === 0)
  const hasPendingForms = pendingForms.length > 0

  const tabs = [
    { id: 'perfil' as TabType, label: 'Perfil', icon: User },
    { id: 'disc' as TabType, label: 'DISC', icon: Brain, badge: participant.disc_profile },
    { id: 'vendas' as TabType, label: 'Vendas', icon: DollarSign, badge: sales.length > 0 ? `${sales.length}` : undefined },
  ]

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Mobile: Compact Header with Back Button */}
      <div className="flex items-center gap-2 -mx-2 lg:mx-0">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="flex-1 font-bold text-gray-900 text-lg lg:text-xl truncate">
          {participant.name}
        </h1>
        {/* Desktop only: Delete button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteParticipantModal(true)}
          className="hidden lg:flex text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </div>

      {/* Compact Profile Card */}
      <Card className="!p-3 lg:!p-5">
        {/* Row 1: Avatar + Info + Quick Actions */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => participant.photo_url && setPhotoModal(true)}
            className="flex-shrink-0"
          >
            <Avatar src={participant.photo_url} alt={participant.name} size="lg" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Contact Info */}
            <div className="space-y-1">
              {participant.email && (
                <p className="text-gray-600 text-sm truncate">{participant.email}</p>
              )}
              {participant.phone && (
                <p className="text-gray-500 text-sm">{participant.phone}</p>
              )}
            </div>

            {/* Badges - Horizontal scroll on mobile */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {participant.color && (
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getColorClass(participant.color)}`}>
                  {formatColorLabel(participant.color)}
                </span>
              )}
              {participant.qualification && (
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getQualificationClass(participant.qualification)}`}>
                  {formatQualificationLabel(participant.qualification)}
                </span>
              )}
              {(participant as any).category && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {(participant as any).category}
                </span>
              )}
              {(participant as any).status && (
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass((participant as any).status)}`}>
                  {formatStatusLabel((participant as any).status)}
                </span>
              )}
              {participant.is_opportunity && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Oportunidade
                </span>
              )}
              {hasDiscProfile && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  DISC: {participant.disc_profile}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Action Buttons - Compact */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          {participant.phone && (
            <a
              href={`https://wa.me/${participant.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 active:bg-green-600 text-white rounded-lg font-medium text-sm transition-colors touch-manipulation"
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp</span>
            </a>
          )}
          <button
            onClick={handleMarcarChamado}
            disabled={chamadoSaving}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors touch-manipulation ${
              participant.chamado
                ? 'bg-yellow-100 text-yellow-800 active:bg-yellow-200'
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            {chamadoSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneCall className="h-4 w-4" />
            )}
            <span>{participant.chamado ? `Chamado (${participant.times_called || 1}x)` : 'Chamado'}</span>
          </button>
          {/* Mobile: More options */}
          <button
            onClick={() => setDeleteParticipantModal(true)}
            className="lg:hidden p-2.5 rounded-lg bg-gray-100 text-gray-500 active:bg-red-100 active:text-red-600 transition-colors touch-manipulation"
            title="Mais opções"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </Card>

      {/* Tabs - Mobile Optimized */}
      <div className="border-b border-gray-200 bg-white -mx-4 px-4 lg:mx-0 lg:px-0">
        <nav className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 lg:px-4 py-2.5 border-b-2 font-medium transition-all whitespace-nowrap flex-shrink-0 text-sm touch-manipulation ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 active:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {/* PERFIL TAB */}
        {activeTab === 'perfil' && (
          <div className="space-y-4">
            {/* Status Strip - Presença + Closer + Chamados */}
            <div className="grid grid-cols-3 gap-2">
              {/* Presença */}
              <div className="bg-white rounded-xl border p-3">
                <p className="text-[10px] text-gray-500 uppercase font-medium mb-2">Presença</p>
                <div className="flex gap-1">
                  {[1, 2, 3].map((day) => {
                    const field = `checked_in_day${day}` as keyof Participant
                    const isChecked = participant[field] as boolean
                    const isSaving = checkinSaving === day
                    return (
                      <button
                        key={day}
                        onClick={() => handleToggleCheckin(day)}
                        disabled={isSaving}
                        className={`flex-1 flex flex-col items-center py-1.5 rounded-lg transition-all ${
                          isChecked
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        } ${isSaving ? 'opacity-60' : 'cursor-pointer'}`}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isChecked ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span className="text-[10px] font-bold">D{day}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Closer */}
              <button
                onClick={() => setAssignCloserModal(true)}
                className="bg-white rounded-xl border p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Closer</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {assignedCloser?.name || 'Não atribuído'}
                </p>
              </button>

              {/* Chamados */}
              <div
                className={`rounded-xl border p-3 text-left transition-colors ${
                  participant.chamado
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Chamados</p>
                  {!editingChamados && (
                    <button
                      onClick={() => { setChamadosInput(String(participant.times_called || 0)); setEditingChamados(true) }}
                      className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {editingChamados ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={chamadosInput}
                      onChange={(e) => setChamadosInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveChamados(parseInt(chamadosInput) || 0)
                        if (e.key === 'Escape') setEditingChamados(false)
                      }}
                      autoFocus
                      className="w-12 text-sm font-medium text-gray-900 border border-gray-300 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => handleSaveChamados(parseInt(chamadosInput) || 0)}
                      disabled={chamadoSaving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      {chamadoSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => setEditingChamados(false)}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className={`text-sm font-medium ${participant.chamado ? 'text-yellow-700' : 'text-gray-900'}`}>
                    {chamadoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : `${participant.times_called || 0}x`}
                  </p>
                )}
              </div>
            </div>

            {/* Action Bar - Vender */}
            <button
              onClick={() => { setSaleData(prev => ({ ...prev, closer_id: participant?.closer_id || '' })); setSaleModal(true) }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl font-medium transition-colors"
            >
              <DollarSign className="h-5 w-5" />
              <span>Registrar Venda</span>
            </button>

            {/* Seção Contato */}
            <div className="bg-white rounded-xl border divide-y">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase font-medium">Contato</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isEditing) handleSave()
                    setIsEditing(!isEditing)
                  }}
                  loading={saving}
                >
                  {isEditing ? <><Check className="h-3 w-3 mr-1" />Salvar</> : <><Pencil className="h-3 w-3 mr-1" />Editar</>}
                </Button>
              </div>
              {participant.email && (
                <a href={`mailto:${participant.email}`} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{participant.email}</span>
                </a>
              )}
              {participant.phone && (
                <a href={`https://wa.me/${participant.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <Phone className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-900">{participant.phone}</span>
                  <ExternalLink className="h-3 w-3 text-gray-400 ml-auto" />
                </a>
              )}
              {participant.instagram && (
                <a href={getInstagramUrl(participant.instagram) || '#'} target="_blank" rel="noopener noreferrer" className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <span className="text-pink-500 text-sm font-medium">@</span>
                  <span className="text-sm text-gray-900">{participant.instagram}</span>
                  <ExternalLink className="h-3 w-3 text-gray-400 ml-auto" />
                </a>
              )}
            </div>

            {/* Seção Acompanhante */}
            {((participant as any).tem_acompanhante || participant.companion) && (
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase font-medium mb-2">Acompanhante</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{participant.companion || '-'}</p>
                    {(participant as any).relacao_acompanhante && (
                      <p className="text-sm text-gray-500">{(participant as any).relacao_acompanhante}</p>
                    )}
                  </div>
                  {companionMatch && (
                    <button
                      onClick={() => router.push(`/admin/participantes/${companionMatch.id}`)}
                      className="ml-auto text-sm text-blue-600 hover:underline"
                    >
                      Ver perfil
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Seção Negócio */}
            <div className="bg-white rounded-xl border divide-y">
              <div className="px-4 py-3">
                <span className="text-xs text-gray-500 uppercase font-medium">Negócio</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-500">Área de Atuação</span>
                <span className="text-sm font-medium text-gray-900">{participant.niche || '-'}</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-500">Faturamento</span>
                <span className="text-sm font-medium text-gray-900">{normalizeRevenue(participant.revenue) || participant.revenue || '-'}</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-500">Funil de Origem</span>
                {isEditing ? (
                  <Select value={formData.funnel} onChange={(e) => setFormData({ ...formData, funnel: e.target.value })} options={FUNIL_OPTIONS} className="w-40" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{participant.funnel || '-'}</span>
                )}
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-500">Vendedor</span>
                {isEditing ? (
                  <Select
                    value={formData.seller_closer_id}
                    onChange={(e) => setFormData({ ...formData, seller_closer_id: e.target.value })}
                    options={[{ value: '', label: 'Selecione...' }, ...closers.map(c => ({ value: c.id, label: c.name }))]}
                    className="w-40"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{participant.seller_closer_name || closers.find(c => c.id === participant.seller_closer_id)?.name || '-'}</span>
                )}
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-gray-500">É Oportunidade?</span>
                {isEditing ? (
                  <Checkbox id="is_opportunity" checked={formData.is_opportunity} onChange={(e) => setFormData({ ...formData, is_opportunity: e.target.checked })} />
                ) : (
                  <span className={`text-sm font-medium ${participant.is_opportunity ? 'text-green-600' : 'text-gray-500'}`}>
                    {participant.is_opportunity ? 'Sim' : 'Não'}
                  </span>
                )}
              </div>
            </div>

            {/* Dados do Credenciamento - All form Q&A from webhook */}
            {(() => {
              // Get form_data from participant, or fallback to webhook_data
              const rawFormData = (participant as any).form_data
                || (participant.webhook_data as any)?.participant?.form_data
                || (participant.webhook_data as any)?.fields
                || null

              if (!rawFormData || typeof rawFormData !== 'object' || Object.keys(rawFormData).length === 0) return null

              // Normalize key for comparison
              const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')

              // Keys already displayed in other sections - skip these
              const skipKeys = new Set([
                'nome', 'name', 'nome_completo', 'email', 'telefone', 'phone', 'whatsapp', 'celular',
                'instagram', 'insta', 'cpf', 'cnpj', 'documento',
              ])

              const entries = Object.entries(rawFormData).filter(([key, value]) => {
                if (value === null || value === undefined || value === '') return false
                const nk = norm(key)
                return !skipKeys.has(nk) && ![...skipKeys].some(sk => nk.includes(sk) && nk.length < sk.length + 15)
              })

              if (entries.length === 0) return null

              const isUrl = (v: string) => typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))

              return (
                <div className="bg-white rounded-xl border divide-y">
                  <div className="px-4 py-3">
                    <span className="text-xs text-gray-500 uppercase font-medium">Dados do Credenciamento</span>
                  </div>
                  {entries.map(([question, answer], idx) => (
                    <div key={idx} className="px-4 py-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">{question}</p>
                      {isUrl(String(answer)) ? (
                        <a
                          href={String(answer)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {String(answer).length > 60 ? String(answer).substring(0, 60) + '...' : String(answer)}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 break-words">{String(answer)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Respostas do Formulário */}
            {(participant.challenge_answer || participant.desired_change_answer) && (
              <div className="bg-white rounded-xl border divide-y">
                <div className="px-4 py-3">
                  <span className="text-xs text-gray-500 uppercase font-medium">Respostas do Formulário</span>
                </div>
                {participant.challenge_answer && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-purple-600 font-medium mb-1">Maior dificuldade</p>
                    <p className="text-sm text-gray-900">{participant.challenge_answer}</p>
                  </div>
                )}
                {participant.desired_change_answer && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-indigo-600 font-medium mb-1">O que espera do evento</p>
                    <p className="text-sm text-gray-900">{participant.desired_change_answer}</p>
                  </div>
                )}
              </div>
            )}

            {/* Observações */}
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">Observações</p>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                onBlur={handleSave}
                placeholder="Adicione observações sobre o participante..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Vendas */}
            <div className="bg-white rounded-xl border divide-y">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase font-medium">Vendas ({sales.length})</span>
                {sales.length > 0 && (
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(sales.reduce((sum, s) => sum + Number(s.total_value), 0))}
                  </span>
                )}
              </div>
              {sales.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  Nenhuma venda registrada
                </div>
              ) : (
                sales.map((sale: any) => (
                  <div key={sale.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sale.product_name}</p>
                      <p className="text-xs text-gray-500">{sale.closer?.name || '-'} • {sale.negotiation_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-green-600">{formatCurrency(sale.total_value)}</span>
                      <button onClick={() => handleEditSale(sale)} className="p-1 text-gray-400 hover:text-blue-600">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => setDeletingSale(sale)} className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DISC Preview */}
            {hasDiscProfile && (
              <button
                onClick={() => setActiveTab('disc')}
                className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 flex items-center gap-4 hover:from-blue-100 hover:to-indigo-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                  {participant.disc_profile}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-blue-800">Perfil DISC: {participant.disc_profile === 'D' ? 'Dominância' : participant.disc_profile === 'I' ? 'Influência' : participant.disc_profile === 'S' ? 'Estabilidade' : participant.disc_profile === 'C' ? 'Conformidade' : participant.disc_profile}</p>
                  <p className="text-xs text-blue-600">Toque para ver análise completa</p>
                </div>
                <ExternalLink className="h-4 w-4 text-blue-400" />
              </button>
            )}
          </div>
        )}

        {/* DISC TAB */}
        {activeTab === 'disc' && (
          <div className="space-y-6">
            {/* ═══════════════════════════════════════════════ */}
            {/* STATE 1: No forms generated yet */}
            {/* ═══════════════════════════════════════════════ */}
            {!hasDiscProfile && !hasCompletedForms && !hasPendingForms && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Formulário DISC não preenchido</p>
                  <Button onClick={handleGenerateForm} loading={formLoading}>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Formulário
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* STATE 2: Forms generated, awaiting response */}
            {/* ═══════════════════════════════════════════════ */}
            {!hasDiscProfile && !hasCompletedForms && hasPendingForms && (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                      <RefreshCw className="h-8 w-8 text-amber-500 animate-[spin_3s_linear_infinite]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Aguardando resposta</h3>
                    <p className="text-gray-500 text-sm">
                      O formulário foi enviado. Assim que o participante responder, a análise aparecerá aqui.
                    </p>
                  </div>
                  <div className="space-y-3 max-w-md mx-auto">
                    {pendingForms.map((form: any) => (
                      <div key={form.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="warning">Pendente</Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => copyFormLink(form)} title="Copiar link">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <a href={`/form/${getFormCode(form)}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" title="Abrir formulário">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={typeof window !== 'undefined' ? `${window.location.origin}/form/${getFormCode(form)}` : `/form/${getFormCode(form)}`}
                            className="flex-1 text-xs p-2 bg-white border rounded text-gray-600 font-mono"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <Button size="sm" onClick={() => copyFormLink(form)}>
                            Copiar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-6">
                    <Button variant="secondary" onClick={handleGenerateForm} loading={formLoading}>
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Novo Formulário
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* STATE 3: Form completed but not processed */}
            {/* ═══════════════════════════════════════════════ */}
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

            {/* ═══════════════════════════════════════════════ */}
            {/* STATE 4: Has DISC profile - Full Analysis */}
            {/* ═══════════════════════════════════════════════ */}
            {hasDiscProfile && (
              <>
                {/* ── Perfil Comportamental ── */}
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Perfil Comportamental
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* DISC Profile badge + Archetype */}
                    <div className="flex items-center gap-4 p-4 bg-white/80 rounded-xl border border-blue-100">
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                        {participant.disc_profile?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Perfil DISC</p>
                        <p className="text-lg font-bold text-gray-800">
                          {participant.disc_profile === 'D' ? 'Dominância' :
                           participant.disc_profile === 'I' ? 'Influência' :
                           participant.disc_profile === 'S' ? 'Estabilidade' :
                           participant.disc_profile === 'C' ? 'Conformidade' :
                           participant.disc_profile}
                        </p>
                      </div>
                      {participant.primary_archetype && (
                        <div className="ml-auto text-right">
                          <p className="text-sm text-gray-500">Arquétipo</p>
                          <p className="text-lg font-bold text-purple-700">
                            {getArchetypeIcon(participant.primary_archetype)} {participant.primary_archetype}
                            {participant.secondary_archetype && (
                              <span className="text-gray-400 font-normal text-sm"> + {getArchetypeIcon(participant.secondary_archetype)} {participant.secondary_archetype}</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quem é essa pessoa - AI personality summary */}
                    {participant.personality_summary && (
                      <div className="p-4 bg-white/80 rounded-xl border border-blue-100">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                          Quem é essa pessoa
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{participant.personality_summary}</p>
                      </div>
                    )}

                    {/* Perfil Comportamental Detalhado - AI behavioral_profile */}
                    {(participant as any).behavioral_profile && (
                      <div className="p-4 bg-white/80 rounded-xl border border-blue-100">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Brain className="h-4 w-4 text-indigo-600" />
                          Comportamento e Padrões
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{(participant as any).behavioral_profile}</p>
                      </div>
                    )}

                    {/* Combinação DISC + Arquétipos - AI archetype_disc_combo */}
                    {(participant as any).archetype_disc_combo && (
                      <div className="p-4 bg-white/80 rounded-xl border border-purple-100">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          {participant.primary_archetype ? `${getArchetypeIcon(participant.primary_archetype)} ${participant.primary_archetype}` : 'Arquétipo'}
                          {participant.secondary_archetype && (
                            <span className="text-gray-400 font-normal text-sm">+ {getArchetypeIcon(participant.secondary_archetype)} {participant.secondary_archetype}</span>
                          )}
                          <span className="text-gray-400 font-normal text-sm">× DISC {participant.disc_profile}</span>
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{(participant as any).archetype_disc_combo}</p>
                      </div>
                    )}

                    {/* Fallback: static archetype description when AI combo not available */}
                    {!(participant as any).archetype_disc_combo && participant.primary_archetype && participant.archetype_description && (
                      <div className="p-4 bg-white/80 rounded-xl border border-purple-100">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <span>{getArchetypeIcon(participant.primary_archetype)}</span>
                          {participant.primary_archetype}
                          {participant.secondary_archetype && (
                            <span className="text-gray-400 font-normal text-sm">+ {getArchetypeIcon(participant.secondary_archetype)} {participant.secondary_archetype}</span>
                          )}
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{participant.archetype_description}</p>
                      </div>
                    )}

                    {/* Estilo de Comunicação - AI communication_style */}
                    {(participant as any).communication_style && (
                      <div className="p-4 bg-white/80 rounded-xl border border-amber-100">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-amber-600" />
                          Estilo de Comunicação
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{(participant as any).communication_style}</p>
                      </div>
                    )}

                    {/* Como Abordar - AI how_to_approach */}
                    {(participant as any).how_to_approach && (
                      <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-green-600" />
                          Como Agir com Essa Pessoa
                        </h4>
                        <p className="text-green-900 leading-relaxed">{(participant as any).how_to_approach}</p>
                      </div>
                    )}

                    {/* Fallback: static DISC behavior when no AI personality */}
                    {!participant.personality_summary && participant.disc_analysis && (participant.disc_analysis as any).profile_description && (
                      <div className="p-4 bg-white/80 rounded-xl border border-blue-100">
                        <h4 className="font-semibold text-gray-800 mb-2">Como se comporta</h4>
                        <p className="text-gray-700 leading-relaxed">{(participant.disc_analysis as any).profile_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ── DISC Scores ── */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Scores DISC
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { label: 'D', value: participant.disc_score_d, color: 'bg-red-500', lightColor: 'bg-red-100', textColor: 'text-red-700', name: 'Dominância' },
                        { label: 'I', value: participant.disc_score_i, color: 'bg-yellow-500', lightColor: 'bg-yellow-100', textColor: 'text-yellow-700', name: 'Influência' },
                        { label: 'S', value: participant.disc_score_s, color: 'bg-green-500', lightColor: 'bg-green-100', textColor: 'text-green-700', name: 'Estabilidade' },
                        { label: 'C', value: participant.disc_score_c, color: 'bg-blue-500', lightColor: 'bg-blue-100', textColor: 'text-blue-700', name: 'Conformidade' },
                      ].map((score) => {
                        const total = (participant.disc_score_d || 0) + (participant.disc_score_i || 0) + (participant.disc_score_s || 0) + (participant.disc_score_c || 0)
                        const pct = total > 0 ? Math.round(((score.value || 0) / total) * 100) : 0
                        return (
                          <div key={score.label} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${score.lightColor} flex items-center justify-center`}>
                              <span className={`text-sm font-bold ${score.textColor}`}>{score.label}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-gray-600">{score.name}</span>
                                <span className={`text-sm font-bold ${score.textColor}`}>{pct}%</span>
                              </div>
                              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${score.color} rounded-full transition-all`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* ── Open Answers ── */}
                {(participant.challenge_answer || participant.desired_change_answer) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-indigo-600" />
                        Respostas Abertas do Participante
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {participant.challenge_answer && (
                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                          <p className="text-xs uppercase tracking-wider text-indigo-500 font-semibold mb-2">Maior desafio atual</p>
                          <p className="text-gray-700 italic">&ldquo;{participant.challenge_answer}&rdquo;</p>
                        </div>
                      )}
                      {participant.desired_change_answer && (
                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                          <p className="text-xs uppercase tracking-wider text-indigo-500 font-semibold mb-2">Mudança desejada</p>
                          <p className="text-gray-700 italic">&ldquo;{participant.desired_change_answer}&rdquo;</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* ═══════════════════════════════════════════════ */}
                {/* INSIGHTS DE VENDAS */}
                {/* ═══════════════════════════════════════════════ */}
                <div className="pt-2">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Insights para Vender para {participant.name?.split(' ')[0]}
                  </h2>
                </div>

                {/* Quick Tips */}
                {participant.quick_tips && participant.quick_tips.length > 0 && (
                  <Card className="border-green-200 bg-green-50/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <Lightbulb className="h-5 w-5" />
                        Dicas Rápidas para Abordagem
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {participant.quick_tips.map((tip: string, i: number) => (
                          <li key={i} className="text-green-700 flex items-start gap-3 p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-500" />
                            <span>{tip}</span>
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
                      <p className="text-sm text-gray-500 mt-1">O que faz essa pessoa decidir comprar</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(participant.decision_triggers as string[]).map((trigger: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            <span className="text-gray-700">{trigger}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Predicted Objections + How to Handle */}
                {participant.predicted_objections && Array.isArray(participant.predicted_objections) && participant.predicted_objections.length > 0 && (
                  <Card className="border-amber-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Objeções Previstas e Como Contornar
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Objeções que essa pessoa provavelmente vai trazer e scripts prontos para responder</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(participant.predicted_objections as Array<{objection: string; script: string}>).map((obj, i: number) => (
                          <div key={i} className="rounded-xl border border-amber-200 overflow-hidden">
                            <div className="bg-amber-50 p-4 border-b border-amber-200">
                              <p className="font-semibold text-amber-800 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                Objeção: &ldquo;{obj.objection}&rdquo;
                              </p>
                            </div>
                            <div className="p-4 bg-white">
                              <p className="text-xs uppercase tracking-wider text-green-600 font-semibold mb-2">Como contornar:</p>
                              <p className="text-gray-700 leading-relaxed">{obj.script}</p>
                            </div>
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
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Estratégias de Fechamento
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Scripts prontos para fechar a venda com essa pessoa</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(participant.closing_strategies as Array<{name: string; script: string}>).map((strategy, i: number) => (
                          <div key={i} className="rounded-xl border border-green-200 overflow-hidden">
                            <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                              <p className="font-semibold text-green-800 text-sm">{strategy.name}</p>
                            </div>
                            <div className="p-4 bg-white">
                              <p className="text-gray-700 italic">&ldquo;{strategy.script}&rdquo;</p>
                            </div>
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
                        O Que NÃO Fazer com Esse Participante
                      </CardTitle>
                      <p className="text-sm text-red-600/70 mt-1">Erros que podem travar a negociação</p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {participant.things_to_avoid.map((item: string, i: number) => (
                          <li key={i} className="text-red-700 flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                            <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Sales Approach */}
                {participant.sales_approach && Array.isArray(participant.sales_approach) && participant.sales_approach.length > 0 && (
                  <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Zap className="h-5 w-5" />
                        Abordagem de Vendas Recomendada
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {(participant.sales_approach as string[]).map((tip: string, i: number) => (
                          <li key={i} className="text-blue-700 flex items-start gap-3 p-2 bg-blue-50 rounded-lg">
                            <Lightbulb className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-400" />
                            <span>{tip}</span>
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

        {/* VENDAS TAB */}
        {activeTab === 'vendas' && (
          <div className="space-y-4">
            {/* Resumo */}
            {sales.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border p-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Total Vendas</p>
                  <p className="text-xl font-bold text-green-600">{sales.length}</p>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Valor Total</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(sales.reduce((sum, s) => sum + Number(s.total_value), 0))}</p>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center col-span-2 lg:col-span-1">
                  <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Entrada Total</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(sales.reduce((sum, s) => sum + Number(s.entry_value), 0))}</p>
                </div>
              </div>
            )}

            {/* Botão Registrar Venda */}
            <button
              onClick={() => { setSaleData(prev => ({ ...prev, closer_id: participant?.closer_id || '' })); setSaleModal(true) }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl font-medium transition-colors"
            >
              <DollarSign className="h-5 w-5" />
              <span>Registrar Venda</span>
            </button>

            {/* Cards de Vendas */}
            {sales.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">Nenhuma venda registrada</p>
                <p className="text-xs text-gray-400">Clique no botão acima para registrar a primeira venda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sales.map((sale: any) => (
                  <div key={sale.id} className="bg-white rounded-xl border overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm">{sale.product_name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {sale.created_at ? formatDateBR(sale.created_at) : '—'}
                            {sale.dia_evento ? ` • Dia ${sale.dia_evento}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={() => handleEditSale(sale)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeletingSale(sale)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-medium">Valor Total</p>
                          <p className="text-sm font-bold text-green-600">{formatCurrency(sale.total_value)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-medium">Entrada</p>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(sale.entry_value)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-medium">Próx. Semana</p>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(sale.valor_proxima_semana)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-t">
                      <div className="flex items-center gap-2">
                        {sale.closer && (
                          <>
                            <Avatar src={sale.closer.photo_url} alt={sale.closer.name} size="sm" />
                            <span className="text-xs text-gray-700">{sale.closer.name}</span>
                          </>
                        )}
                      </div>
                      <Badge variant={sale.negotiation_type === 'fechamento' ? 'success' : 'default'}>
                        {sale.negotiation_type === 'fechamento' ? 'Fechamento' : sale.negotiation_type === 'negociacao' ? 'Negociação' : sale.negotiation_type}
                      </Badge>
                    </div>
                    {sale.observacoes && (
                      <div className="px-4 py-2.5 border-t text-xs text-gray-600 bg-gray-50/50">
                        {sale.observacoes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

      <Modal isOpen={saleModal} onClose={handleCloseSaleModal} title={editingSale ? 'Editar Venda' : 'Registrar Venda'}>
        <form onSubmit={editingSale ? handleUpdateSale : handleRegisterSale} className="space-y-4">
          <Select
            label="Closer Responsável"
            value={saleData.closer_id}
            onChange={(e) => setSaleData({ ...saleData, closer_id: e.target.value })}
            options={[
              { value: '', label: 'Selecione o closer...' },
              ...closers.map(c => ({ value: c.id, label: c.name })),
            ]}
            required
          />
          <Input label="Produto Vendido" value={saleData.product_name} onChange={(e) => setSaleData({ ...saleData, product_name: e.target.value })} required />
          <Input label="Valor Total (R$)" type="text" inputMode="numeric" placeholder="R$ 0,00" value={saleData.total_value} onChange={(e) => setSaleData({ ...saleData, total_value: formatCurrencyInput(e.target.value) })} required />
          <Input label="Valor Entrada (R$)" type="text" inputMode="numeric" placeholder="R$ 0,00" value={saleData.entry_value} onChange={(e) => setSaleData({ ...saleData, entry_value: formatCurrencyInput(e.target.value) })} required />
          <Input label="Valor Próxima Semana (R$)" type="text" inputMode="numeric" placeholder="R$ 0,00" value={saleData.valor_proxima_semana} onChange={(e) => setSaleData({ ...saleData, valor_proxima_semana: formatCurrencyInput(e.target.value) })} />
          <Input label="Negociação" value={saleData.negotiation_type} onChange={(e) => setSaleData({ ...saleData, negotiation_type: e.target.value })} required />
          <Select
            label="Dia do Evento"
            value={saleData.dia_evento}
            onChange={(e) => setSaleData({ ...saleData, dia_evento: e.target.value })}
            options={[
              { value: '', label: 'Selecione...' },
              { value: '1', label: 'Dia 1' },
              { value: '2', label: 'Dia 2' },
              { value: '3', label: 'Dia 3' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={3}
              placeholder="Anotações sobre a negociação..."
              value={saleData.observacoes}
              onChange={(e) => setSaleData({ ...saleData, observacoes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseSaleModal}>Cancelar</Button>
            <Button type="submit" loading={formLoading}>{editingSale ? 'Salvar' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Sale Confirmation Modal */}
      <Modal isOpen={!!deletingSale} onClose={() => setDeletingSale(null)} title="Confirmar Exclusão">
        <p className="text-gray-600">
          Tem certeza que deseja excluir a venda do produto <strong>{deletingSale?.product_name}</strong>?
          <br />
          <span className="text-sm text-gray-500">Valor: {deletingSale ? formatCurrency(deletingSale.total_value) : ''}</span>
        </p>
        <p className="text-red-600 text-sm mt-2">Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeletingSale(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteSale} loading={formLoading}>
            Excluir Venda
          </Button>
        </div>
      </Modal>

      {/* Photo Preview Modal */}
      {photoModal && participant?.photo_url && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPhotoModal(false)}>
          <div className="relative max-w-lg max-h-[80vh]">
            <img
              src={participant.photo_url}
              alt={participant.name}
              className="max-w-full max-h-[80vh] rounded-xl object-contain"
            />
            <button
              onClick={() => setPhotoModal(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Delete Participant Confirmation Modal */}
      <Modal isOpen={deleteParticipantModal} onClose={() => setDeleteParticipantModal(false)} title="Excluir Participante">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Tem certeza que deseja excluir este participante?</p>
              <p className="text-sm text-red-600 mt-1">
                Todos os dados serão removidos permanentemente, incluindo vendas, formulários e análises DISC.
              </p>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Participante: <strong>{participant.name}</strong></p>
            {participant.email && <p className="text-sm text-gray-500">{participant.email}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteParticipantModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteParticipant} loading={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Participante
            </Button>
          </div>
        </div>
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
