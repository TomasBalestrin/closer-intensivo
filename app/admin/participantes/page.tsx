'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Card, Avatar, Badge, Modal } from '@/components/ui'
import { Search, Filter, ExternalLink, Download, Plus, Users, CheckSquare, Square, Phone, Trash2 } from 'lucide-react'
import { Participant, User, getParticipantCardStatus, CARD_STATUS_STYLES } from '@/lib/types'
import { getColorClass, getInstagramUrl, exportToCSV, formatBoolean, FATURAMENTO_OPTIONS, FUNIL_OPTIONS, getColorFromRevenue, getQualificationFromRevenue, normalizeRevenue, cn } from '@/lib/utils'
import { useDebounce } from '@/lib/hooks'
import { useEvent } from '@/lib/hooks/use-event'
import { PullToRefresh } from '@/components/shared/pull-to-refresh'
import { ParticipantGridSkeleton } from '@/components/shared/skeleton'

export default function AdminParticipantes() {
  const router = useRouter()
  const supabase = createClient()
  const { activeEvent, isLoading: eventLoading } = useEvent()
  const [participants, setParticipants] = useState<(Participant & { seller_closer?: User | null; hasSale?: boolean })[]>([])
  const [closers, setClosers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [funnelFilter, setFunnelFilter] = useState('')
  const [sellerFilter, setSellerFilter] = useState('')
  const [unassignedFilter, setUnassignedFilter] = useState(false)
  const [assignedCloserFilter, setAssignedCloserFilter] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('')
  const [saleFilter, setSaleFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [checkinFilter, setCheckinFilter] = useState('')
  const [qualificationFilter, setQualificationFilter] = useState('')
  const [discRespondidoFilter, setDiscRespondidoFilter] = useState('')
  const [chamadoFilter, setChamadoFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [visibleCount, setVisibleCount] = useState(30)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [assignCloserId, setAssignCloserId] = useState('')

  // Import centralized options from utils

  // Create participant form
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    revenue: '',
    niche: '',
    funnel: '',
    badge_name: '',
    is_opportunity: false,
  })
  const [creating, setCreating] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Build queries with event filter
    let participantsQuery = supabase
      .from('participants')
      .select('*, seller_closer:users!participants_seller_closer_id_fkey(id, name, email, photo_url)')
      .order('created_at', { ascending: false })

    let salesQuery = supabase
      .from('sales')
      .select('participant_id')
      .is('deleted_at', null)

    // Filter by active event if selected
    if (activeEvent?.id) {
      participantsQuery = participantsQuery.eq('event_id', activeEvent.id)
      salesQuery = salesQuery.eq('event_id', activeEvent.id)
    }

    // Get closers - filter by event if selected
    let closersData: User[] = []
    if (activeEvent?.id) {
      // First get user_ids from user_events for this event with role 'closer'
      const { data: userEventsData } = await supabase
        .from('user_events')
        .select('user_id')
        .eq('event_id', activeEvent.id)
        .eq('role', 'closer')

      if (userEventsData && userEventsData.length > 0) {
        const userIds = userEventsData.map((ue: any) => ue.user_id)
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email, photo_url, role')
          .in('id', userIds)
        closersData = (usersData || []) as User[]
      }
    } else {
      const { data } = await supabase.from('users').select('*').eq('role', 'closer')
      closersData = (data || []) as User[]
    }

    const [participantsRes, salesRes] = await Promise.all([
      participantsQuery,
      salesQuery,
    ])

    // Use Set for O(1) lookup instead of .some() O(n)
    const salesSet = new Set(salesRes.data?.map(s => s.participant_id))
    const participantsWithSales = participantsRes.data?.map(p => ({
      ...p,
      hasSale: salesSet.has(p.id),
    })) || []

    setParticipants(participantsWithSales)
    setClosers(closersData)
    setVisibleCount(30)
    setLoading(false)
  }, [activeEvent?.id])

  useEffect(() => {
    // Wait for event to be loaded before fetching data
    if (!eventLoading) {
      fetchData()
    }
  }, [fetchData, eventLoading])

  // Refetch when returning from detail page with changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionStorage.getItem('participants-data-changed')) {
        sessionStorage.removeItem('participants-data-changed')
        fetchData()
      }
    }
    const handleFocus = () => {
      if (sessionStorage.getItem('participants-data-changed')) {
        sessionStorage.removeItem('participants-data-changed')
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    // Also check on mount (back navigation)
    if (sessionStorage.getItem('participants-data-changed')) {
      sessionStorage.removeItem('participants-data-changed')
      fetchData()
    }
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchData])

  const filteredParticipants = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase()
    return participants.filter((p: any) => {
      const matchesSearch = !debouncedSearch ||
        p.name?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.niche?.toLowerCase().includes(searchLower) ||
        p.instagram?.toLowerCase().includes(searchLower)
      const matchesFunnel = !funnelFilter || p.funnel === funnelFilter
      const matchesSeller = !sellerFilter || (sellerFilter === 'unassigned' ? (!p.seller_closer_id && !p.seller_closer_name && !p.seller_closer?.name) : p.seller_closer_id === sellerFilter)
      const matchesAssignedCloser = !assignedCloserFilter || (assignedCloserFilter === 'unassigned' ? !p.assigned_closer_id : p.assigned_closer_id === assignedCloserFilter)
      const matchesOpportunity = opportunityFilter === '' ||
        (opportunityFilter === 'true' ? p.is_opportunity : !p.is_opportunity)
      const matchesSale = saleFilter === '' ||
        (saleFilter === 'true' ? p.hasSale : !p.hasSale)
      const matchesColor = !colorFilter || (p.color === colorFilter) || (getColorFromRevenue(p.revenue) === colorFilter)
      const matchesCheckin = !checkinFilter ||
        (checkinFilter === 'day1' ? p.checked_in_day1 :
         checkinFilter === 'day2' ? p.checked_in_day2 :
         checkinFilter === 'day3' ? p.checked_in_day3 :
         checkinFilter === 'any' ? (p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3) :
         checkinFilter === 'none' ? (!p.checked_in_day1 && !p.checked_in_day2 && !p.checked_in_day3) : true)
      const matchesQualification = !qualificationFilter || p.qualification === qualificationFilter
      const matchesDiscRespondido = discRespondidoFilter === '' ||
        (discRespondidoFilter === 'true' ? p.form_completed_at !== null : p.form_completed_at === null)
      const matchesChamado = chamadoFilter === '' ||
        (chamadoFilter === 'true' ? p.chamado : !p.chamado)

      return matchesSearch && matchesFunnel && matchesSeller && matchesAssignedCloser && matchesOpportunity && matchesSale && matchesColor && matchesCheckin && matchesQualification && matchesDiscRespondido && matchesChamado
    })
  }, [participants, debouncedSearch, funnelFilter, sellerFilter, assignedCloserFilter, opportunityFilter, saleFilter, colorFilter, checkinFilter, qualificationFilter, discRespondidoFilter, chamadoFilter])

  const visibleParticipants = useMemo(() => filteredParticipants.slice(0, visibleCount), [filteredParticipants, visibleCount])

  const hasActiveFilters = funnelFilter || sellerFilter || assignedCloserFilter || opportunityFilter || saleFilter || colorFilter || checkinFilter || qualificationFilter || discRespondidoFilter || chamadoFilter

  const clearFilters = () => {
    setFunnelFilter('')
    setSellerFilter('')
    setAssignedCloserFilter('')
    setOpportunityFilter('')
    setSaleFilter('')
    setColorFilter('')
    setCheckinFilter('')
    setQualificationFilter('')
    setDiscRespondidoFilter('')
    setChamadoFilter('')
    setUnassignedFilter(false)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = selectedParticipants.length > 0
      ? filteredParticipants.filter(p => selectedParticipants.includes(p.id))
      : filteredParticipants

    exportToCSV(dataToExport, [
      { key: 'name', label: 'Nome' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telefone' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'revenue', label: 'Faturamento' },
      { key: 'niche', label: 'Nicho' },
      { key: 'funnel', label: 'Funil' },
      { key: 'is_opportunity', label: 'É Oportunidade', format: (v) => formatBoolean(v) },
      { key: 'qualification', label: 'Qualificação' },
      { key: 'checked_in_day1', label: 'Check-in Dia 1', format: (v) => formatBoolean(v) },
      { key: 'checked_in_day2', label: 'Check-in Dia 2', format: (v) => formatBoolean(v) },
      { key: 'checked_in_day3', label: 'Check-in Dia 3', format: (v) => formatBoolean(v) },
      { key: 'seller_closer.name', label: 'Vendedor/Convidador' },
      { key: 'hasSale', label: 'Tem Venda', format: (v) => formatBoolean(v) },
      // Arquétipos
      { key: 'primary_archetype', label: 'Arquétipo Primário' },
      { key: 'secondary_archetype', label: 'Arquétipo Secundário' },
      { key: 'archetype_description', label: 'Descrição Arquétipo' },
      // DISC
      { key: 'disc_profile', label: 'Perfil DISC' },
      { key: 'disc_score_d', label: 'DISC - D (Dominância)' },
      { key: 'disc_score_i', label: 'DISC - I (Influência)' },
      { key: 'disc_score_s', label: 'DISC - S (Estabilidade)' },
      { key: 'disc_score_c', label: 'DISC - C (Conformidade)' },
      // Insights de vendas
      { key: 'personality_summary', label: 'Resumo Personalidade' },
    ], 'participantes')
  }

  // Create participant
  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const color = getColorFromRevenue(newParticipant.revenue)

      const { error } = await supabase.from('participants').insert({
        name: newParticipant.name,
        email: newParticipant.email || null,
        phone: newParticipant.phone || null,
        instagram: newParticipant.instagram || null,
        revenue: newParticipant.revenue || null,
        niche: newParticipant.niche || null,
        funnel: newParticipant.funnel || null,
        badge_name: newParticipant.badge_name || null,
        is_opportunity: newParticipant.is_opportunity,
        color: color,
        event_id: activeEvent?.id,
      })

      if (error) throw error

      setShowCreateModal(false)
      setNewParticipant({ name: '', email: '', phone: '', instagram: '', revenue: '', niche: '', funnel: '', badge_name: '', is_opportunity: false })
      fetchData()
    } catch (error) {
      console.error('Error creating participant:', error)
      alert('Erro ao criar participante')
    } finally {
      setCreating(false)
    }
  }

  // Bulk assign closer
  const handleBulkAssign = async () => {
    if (!assignCloserId || selectedParticipants.length === 0) return

    setAssigning(true)
    try {
      const { error } = await supabase
        .from('participants')
        .update({ assigned_closer_id: assignCloserId })
        .in('id', selectedParticipants)

      if (error) throw error

      setShowAssignModal(false)
      setSelectedParticipants([])
      setAssignCloserId('')
      fetchData()
    } catch (error) {
      console.error('Error assigning closer:', error)
      alert('Erro ao atribuir closer')
    } finally {
      setAssigning(false)
    }
  }

  // Bulk delete participants
  const handleBulkDelete = async () => {
    if (selectedParticipants.length === 0) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .in('id', selectedParticipants)

      if (error) throw error

      setShowDeleteModal(false)
      setSelectedParticipants([])
      fetchData()
    } catch (error) {
      console.error('Error deleting participants:', error)
      alert('Erro ao excluir participantes')
    } finally {
      setDeleting(false)
    }
  }

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedParticipants.length === filteredParticipants.length) {
      setSelectedParticipants([])
    } else {
      setSelectedParticipants(filteredParticipants.map(p => p.id))
    }
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  return (
    <>
      <PullToRefresh onRefresh={fetchData}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Participantes</h1>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{filteredParticipants.length} participantes</span>
              <Button variant="secondary" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </div>
          </div>

          {/* Search and Filters - Sticky on scroll */}
          <div className="sticky top-14 lg:top-0 z-20 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur-sm space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email, nicho ou Instagram..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>

            {showFilters && (
              <div className="p-4 bg-white rounded-lg shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <Select
                    label="Funil"
                    value={funnelFilter}
                    onChange={(e) => setFunnelFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todos os funis' },
                      ...FUNIL_OPTIONS.filter(o => o.value !== '').map(o => ({ value: o.value, label: o.label })),
                    ]}
                  />
                  <Select
                    label="Cor (Faturamento)"
                    value={colorFilter}
                    onChange={(e) => setColorFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todas as cores' },
                      { value: 'rosa', label: 'Rosa (até R$ 5k)' },
                      { value: 'preto', label: 'Preto (R$ 5k - 10k)' },
                      { value: 'azul_claro', label: 'Azul Claro (R$ 10k - 20k)' },
                      { value: 'verde', label: 'Verde (R$ 20k - 50k)' },
                      { value: 'dourado', label: 'Dourado (R$ 50k - 100k)' },
                      { value: 'laranja', label: 'Laranja (R$ 100k+)' },
                    ]}
                  />
                  <Select
                    label="Vendedor/Convidador"
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'unassigned', label: 'Nenhum' },
                      ...closers.map(c => ({ value: c.id, label: c.name })),
                    ]}
                  />
                  <Select
                    label="Vendedor Atribuído"
                    value={assignedCloserFilter}
                    onChange={(e) => setAssignedCloserFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'unassigned', label: 'Nenhum' },
                      ...closers.map(c => ({ value: c.id, label: c.name })),
                    ]}
                  />
                  <Select
                    label="É Oportunidade"
                    value={opportunityFilter}
                    onChange={(e) => setOpportunityFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'true', label: 'Sim' },
                      { value: 'false', label: 'Não' },
                    ]}
                  />
                  <Select
                    label="Foi uma Venda"
                    value={saleFilter}
                    onChange={(e) => setSaleFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'true', label: 'Sim' },
                      { value: 'false', label: 'Não' },
                    ]}
                  />
                  <Select
                    label="Credenciamento"
                    value={checkinFilter}
                    onChange={(e) => setCheckinFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'day1', label: 'Credenciou Dia 1' },
                      { value: 'day2', label: 'Credenciou Dia 2' },
                      { value: 'day3', label: 'Credenciou Dia 3' },
                      { value: 'any', label: 'Credenciou qualquer dia' },
                      { value: 'none', label: 'Não credenciou' },
                    ]}
                  />
                  <Select
                    label="Qualificação"
                    value={qualificationFilter}
                    onChange={(e) => setQualificationFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todas' },
                      { value: 'alto', label: 'Alto' },
                      { value: 'medio', label: 'Médio' },
                      { value: 'baixo', label: 'Baixo' },
                    ]}
                  />
                  <Select
                    label="DISC Respondido"
                    value={discRespondidoFilter}
                    onChange={(e) => setDiscRespondidoFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'true', label: 'Sim' },
                      { value: 'false', label: 'Não' },
                    ]}
                  />
                  <Select
                    label="Status Chamado"
                    value={chamadoFilter}
                    onChange={(e) => setChamadoFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'true', label: 'Já foi chamado' },
                      { value: 'false', label: 'Ainda não chamado' },
                    ]}
                  />
                </div>
                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Limpar Filtros
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Participants Grid */}
          {loading ? (
            <ParticipantGridSkeleton count={6} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Selection header - mobile optimized */}
                <div className="flex items-center gap-3 col-span-full mb-1 p-3 -mx-1 sm:mx-0 bg-gray-50/80 rounded-lg">
                  <button
                    onClick={toggleSelectAll as any}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg active:bg-gray-200 transition-colors touch-manipulation"
                  >
                    {selectedParticipants.length === filteredParticipants.length && filteredParticipants.length > 0 ? (
                      <CheckSquare className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Square className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                  <span className="text-sm text-gray-600 flex-1">
                    {selectedParticipants.length > 0 ? `${selectedParticipants.length} selecionado(s)` : 'Selecionar'}
                  </span>
                  {selectedParticipants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setShowAssignModal(true)}
                        className="min-h-[44px]"
                      >
                        Atribuir Vendedor
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteModal(true)}
                        className="min-h-[44px]"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>

                {visibleParticipants.map((participant) => {
                  const cardStatus = getParticipantCardStatus(participant as Participant, participant.hasSale ?? false)
                  return (
                  <Card
                    key={participant.id}
                    className={cn(
                      'cursor-pointer transition-all active:scale-[0.98] touch-manipulation',
                      'hover:shadow-lg',
                      CARD_STATUS_STYLES[cardStatus]
                    )}
                    onClick={() => router.push(`/admin/participantes/${participant.id}`)}
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <button
                        onClick={(e) => toggleSelect(participant.id, e)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2 rounded-lg active:bg-gray-100 transition-colors touch-manipulation"
                      >
                        {selectedParticipants.includes(participant.id) ? (
                          <CheckSquare className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Square className="h-6 w-6 text-gray-400" />
                        )}
                      </button>
                      <Avatar
                        src={participant.photo_url}
                        alt={participant.name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-[15px] truncate">
                            {participant.name}
                          </h3>
                          {participant.is_opportunity && (
                            <Badge variant="success">Oportunidade</Badge>
                          )}
                          {(participant.color || getColorFromRevenue(participant.revenue)) && (
                            <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${getColorClass(participant.color || getColorFromRevenue(participant.revenue))}`}>
                              {(participant.color || getColorFromRevenue(participant.revenue)) === 'rosa' && 'Rosa'}
                              {(participant.color || getColorFromRevenue(participant.revenue)) === 'preto' && 'Preto'}
                              {(participant.color || getColorFromRevenue(participant.revenue)) === 'azul_claro' && 'Azul Claro'}
                              {(participant.color || getColorFromRevenue(participant.revenue)) === 'verde' && 'Verde'}
                              {(participant.color || getColorFromRevenue(participant.revenue)) === 'dourado' && 'Dourado'}
                              {(participant.color || getColorFromRevenue(participant.revenue)) === 'laranja' && 'Laranja'}
                            </span>
                          )}
                        </div>
                        {participant.revenue && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            Faturamento: {participant.revenue}
                          </p>
                        )}
                        {(participant.seller_closer?.name || participant.seller_closer_name) && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            Vendedor: {participant.seller_closer?.name || participant.seller_closer_name}
                          </p>
                        )}
                        {participant.niche && (
                          <span
                            className={`inline-block mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${getColorClass(
                              participant.color || getColorFromRevenue(participant.revenue)
                            )}`}
                          >
                            {participant.niche}
                          </span>
                        )}
                        {participant.instagram && (
                          <a
                            href={getInstagramUrl(participant.instagram) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 mt-2 text-sm text-blue-600 active:text-blue-800 min-h-[32px]"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {participant.instagram}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-gray-500">
                      <span className="text-[13px]">
                        Check-ins: {[
                          participant.checked_in_day1 && 'D1',
                          participant.checked_in_day2 && 'D2',
                          participant.checked_in_day3 && 'D3',
                        ].filter(Boolean).join(', ') || 'Nenhum'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[13px]" title="Vezes chamado">
                          <Phone className="h-4 w-4" />
                          {participant.times_called || 0}x
                        </span>
                        {participant.hasSale && (
                          <Badge variant="success">Vendido</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                )})}
              </div>

              {visibleCount < filteredParticipants.length && (
                <div className="col-span-full flex justify-center pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setVisibleCount(prev => prev + 30)}
                  >
                    Carregar mais ({filteredParticipants.length - visibleCount} restantes)
                  </Button>
                </div>
              )}

              {filteredParticipants.length === 0 && (
                <div className="text-center py-12 col-span-full">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum participante encontrado</p>
                </div>
              )}
            </>
          )}
        </div>
      </PullToRefresh>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Participante"
      >
        <form onSubmit={handleCreateParticipant} className="space-y-4">
          <Input
            label="Nome"
            value={newParticipant.name}
            onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={newParticipant.email}
            onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
          />
          <Input
            label="Telefone"
            value={newParticipant.phone}
            onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
          />
          <Input
            label="Instagram"
            value={newParticipant.instagram}
            onChange={(e) => setNewParticipant({ ...newParticipant, instagram: e.target.value })}
          />
          <Select
            label="Faturamento"
            value={newParticipant.revenue}
            onChange={(e) => setNewParticipant({ ...newParticipant, revenue: e.target.value })}
            options={FATURAMENTO_OPTIONS}
          />
          <Input
            label="Nicho"
            value={newParticipant.niche}
            onChange={(e) => setNewParticipant({ ...newParticipant, niche: e.target.value })}
          />
          <Select
            label="Funil"
            value={newParticipant.funnel}
            onChange={(e) => setNewParticipant({ ...newParticipant, funnel: e.target.value })}
            options={FUNIL_OPTIONS}
          />
          <Input
            label="Badge"
            value={newParticipant.badge_name}
            onChange={(e) => setNewParticipant({ ...newParticipant, badge_name: e.target.value })}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newParticipant.is_opportunity}
              onChange={(e) => setNewParticipant({ ...newParticipant, is_opportunity: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">É Oportunidade</span>
          </label>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Atribuir Vendedor"
      >
        <div className="space-y-4">
          <Select
            label="Vendedor"
            value={assignCloserId}
            onChange={(e) => setAssignCloserId(e.target.value)}
            options={closers.map(c => ({ value: c.id, label: c.name }))}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkAssign} disabled={assigning || !assignCloserId}>
              {assigning ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Tem certeza que deseja excluir <strong>{selectedParticipants.length}</strong> participante(s)?
          </p>
          <p className="text-sm text-red-600">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
