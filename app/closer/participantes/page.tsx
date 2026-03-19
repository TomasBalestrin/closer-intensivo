'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Card, Avatar, Badge } from '@/components/ui'
import { Search, Filter, ExternalLink, Phone, LayoutGrid, List } from 'lucide-react'
import { Participant, getParticipantCardStatus, CARD_STATUS_STYLES } from '@/lib/types'
import { getColorClass, getColorFromRevenue, getInstagramUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/lib/hooks'
import { useEvent } from '@/lib/hooks/use-event'
import { PullToRefresh } from '@/components/shared/pull-to-refresh'
import { ParticipantGridSkeleton } from '@/components/shared/skeleton'

const CACHE_KEY = 'closer-participantes-cache'
const SCROLL_KEY = 'closer-participantes-scroll'

function normalizeText(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Matches any key/question that asks for the companion's name
// e.g. "Qual o nome do seu acompanhante?", "Nome e sobrenome do acompanhante",
// "nome_acompanhante", "companion_name", "acompanhante", etc.
function isCompanionKey(key: string): boolean {
  const norm = normalizeText(key)
  // Must mention "acompanhante" or "companion"
  if (!norm.includes('acompanhante') && !norm.includes('companion')) return false
  // If it also mentions name-related words, it's definitely the name field
  if (/nome|name|sobrenome|completo/.test(norm)) return true
  // If the key is short (likely a field id like "acompanhante" or "companion"), accept it
  if (norm.replace(/[^a-z]/g, '').length <= 25) return true
  // If it's a question asking "qual" (which one), accept it
  if (norm.includes('qual')) return true
  return false
}

// Exclude keys that ask yes/no about having a companion or about the relationship
function isCompanionMetaKey(key: string): boolean {
  const norm = normalizeText(key)
  // "voce vai com acompanhante?" / "tem acompanhante?" / "seu acompanhante e (esposa, socio...)"
  if (/vai.+com.+acompanhante|tem.+acompanhante|voce.+acompanhante/.test(norm) && !/nome|name/.test(norm)) return true
  if (/seu.+acompanhante.+e\b|relacao|relationship|tipo.+acompanhante/.test(norm)) return true
  return false
}

function findCompanionName(data: any): string | null {
  if (!data || typeof data !== 'object') return null

  // Handle arrays (common pattern: [{label: "...", value: "..."}, ...])
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object') {
        const label = item.label || item.field || item.name || item.key || item.question || item.titulo || item.ref
        const value = item.value ?? item.answer ?? item.text ?? item.response ?? item.resposta
        if (label && typeof value === 'string' && value.trim()) {
          if (isCompanionKey(String(label)) && !isCompanionMetaKey(String(label))) return value.trim()
        }
      }
      const found = findCompanionName(item)
      if (found) return found
    }
    return null
  }

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'string' && value.trim()) {
      if (isCompanionKey(key) && !isCompanionMetaKey(key)) return value.trim()
    }
    if (value && typeof value === 'object') {
      const found = findCompanionName(value)
      if (found) return found
    }
  }
  return null
}

function getCachedParticipants(): any[] | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch {}
  return null
}

export default function CloserParticipantes() {
  const router = useRouter()
  const supabase = createClient()
  const { activeEvent } = useEvent()
  const restoringScroll = useRef(false)

  // Initialize from cache if available (avoids skeleton flash on back navigation)
  const cached = typeof window !== 'undefined' ? getCachedParticipants() : null
  const [participants, setParticipants] = useState<any[]>(cached || [])
  const [loading, setLoading] = useState(!cached)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [funnelFilter, setFunnelFilter] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('')
  const [saleFilter, setSaleFilter] = useState('')
  const [checkinFilter, setCheckinFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [qualificationFilter, setQualificationFilter] = useState('')
  const [discRespondidoFilter, setDiscRespondidoFilter] = useState('')
  const [chamadoFilter, setChamadoFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')
  const [visibleCount, setVisibleCount] = useState(30)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Build queries with event filter
    let participantsQuery = supabase
      .from('participants')
      .select('*')
      .eq('assigned_closer_id', user.id)
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

    const [participantsRes, salesRes] = await Promise.all([
      participantsQuery,
      salesQuery,
    ])

    const salesSet = new Set(salesRes.data?.map(s => s.participant_id))
    const participantsWithSales = participantsRes.data?.map(p => ({
      ...p,
      hasSale: salesSet.has(p.id),
    })) || []

    setParticipants(participantsWithSales)
    setLoading(false)

    // Cache data for back navigation
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(participantsWithSales))
    } catch {}
  }, [activeEvent?.id])

  useEffect(() => {
    // If data was changed in detail page, clear cache and force fresh fetch
    const dataChanged = sessionStorage.getItem('participants-data-changed')
    if (dataChanged) {
      sessionStorage.removeItem('participants-data-changed')
      sessionStorage.removeItem(CACHE_KEY)
      fetchData(false)
      return
    }
    const hasCache = !!getCachedParticipants()
    if (hasCache) {
      // We have cached data showing instantly - fetch fresh data in background
      fetchData(true)
    } else {
      fetchData(false)
    }
  }, [fetchData])

  // Restore scroll position after cached data renders
  useEffect(() => {
    if (!loading && !restoringScroll.current) {
      const savedScroll = sessionStorage.getItem(SCROLL_KEY)
      if (savedScroll) {
        restoringScroll.current = true
        const scrollY = parseInt(savedScroll, 10)
        sessionStorage.removeItem(SCROLL_KEY)
        // Small delay to ensure DOM has painted
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY)
          // Allow further scroll restores if component re-renders
          setTimeout(() => { restoringScroll.current = false }, 200)
        })
      }
    }
  }, [loading])

  const handleNavigate = (participantId: string) => {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0
    sessionStorage.setItem(SCROLL_KEY, String(scrollY))
    router.push(`/closer/participantes/${participantId}`)
  }

  const funnels = useMemo(() => [...new Set(participants.map(p => p.funnel).filter(Boolean))], [participants])

  const filteredParticipants = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase()
    return participants.filter((p: any) => {
      const matchesSearch = !debouncedSearch || p.name.toLowerCase().includes(searchLower)
      const matchesFunnel = !funnelFilter || p.funnel === funnelFilter
      const matchesOpportunity = opportunityFilter === '' ||
        (opportunityFilter === 'true' ? p.is_opportunity : !p.is_opportunity)
      const matchesSale = saleFilter === '' ||
        (saleFilter === 'true' ? p.hasSale : !p.hasSale)
      const hasCheckin = p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
      const matchesCheckin = checkinFilter === '' ||
        (checkinFilter === 'true' ? hasCheckin : !hasCheckin)
      const matchesColor = !colorFilter || (p.color === colorFilter) || (getColorFromRevenue(p.revenue) === colorFilter)
      const matchesQualification = !qualificationFilter || p.qualification === qualificationFilter
      const matchesDiscRespondido = discRespondidoFilter === '' ||
        (discRespondidoFilter === 'true' ? p.form_completed_at !== null : p.form_completed_at === null)
      const matchesChamado = chamadoFilter === '' ||
        (chamadoFilter === 'true' ? p.chamado : !p.chamado)

      return matchesSearch && matchesFunnel && matchesOpportunity && matchesSale && matchesCheckin && matchesColor && matchesQualification && matchesDiscRespondido && matchesChamado
    })
  }, [participants, debouncedSearch, funnelFilter, opportunityFilter, saleFilter, checkinFilter, colorFilter, qualificationFilter, discRespondidoFilter, chamadoFilter])

  const visibleParticipants = useMemo(() => filteredParticipants.slice(0, visibleCount), [filteredParticipants, visibleCount])

  // Pagination for list view
  const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / PAGE_SIZE))
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredParticipants.slice(start, start + PAGE_SIZE)
  }, [filteredParticipants, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, funnelFilter, opportunityFilter, saleFilter, checkinFilter, colorFilter, qualificationFilter, discRespondidoFilter, chamadoFilter])

  return (
    <PullToRefresh onRefresh={() => fetchData(false)}>
      <div className="space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Meus Participantes</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                )}
                title="Visualizar como lista"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'cards' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                )}
                title="Visualizar como cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <span className="text-gray-500">{filteredParticipants.length} participantes</span>
          </div>
        </div>

        {/* Search and Filters - Sticky on scroll */}
        <div className="sticky top-14 lg:top-0 z-20 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur-sm space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome..."
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-lg shadow-sm">
              <Select
                label="Funil"
                value={funnelFilter}
                onChange={(e) => setFunnelFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos os funis' },
                  ...funnels.map(f => ({ value: f!, label: f! })),
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
                label="Fez Check-in"
                value={checkinFilter}
                onChange={(e) => setCheckinFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'true', label: 'Presentes' },
                  { value: 'false', label: 'Ausentes' },
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
          )}
        </div>

        {/* Participants */}
        {loading ? (
          <ParticipantGridSkeleton count={6} />
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[40px_minmax(140px,1.5fr)_minmax(100px,1fr)_minmax(120px,1fr)_minmax(80px,0.8fr)_minmax(60px,0.5fr)] gap-2 items-center px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div>Foto</div>
              <div>Nome</div>
              <div>Faturamento</div>
              <div>Acompanhante</div>
              <div>Check-in</div>
              <div className="text-center">Chamado</div>
            </div>
            {/* Table rows */}
            {paginatedParticipants.map((participant: any) => {
              const companionName = participant.companion || findCompanionName(participant.webhook_data)
              return (
              <div
                key={participant.id}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[40px_minmax(140px,1.5fr)_minmax(100px,1fr)_minmax(120px,1fr)_minmax(80px,0.8fr)_minmax(60px,0.5fr)] gap-2 items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleNavigate(participant.id)}
              >
                {/* Photo */}
                <div className="hidden sm:block">
                  <Avatar
                    src={participant.photo_url}
                    alt={participant.name}
                    size="md"
                  />
                </div>
                {/* Name (mobile: full row with photo) */}
                <div className="flex items-center gap-3 sm:block min-w-0">
                  <div className="sm:hidden">
                    <Avatar
                      src={participant.photo_url}
                      alt={participant.name}
                      size="md"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate text-sm">{participant.name}</p>
                      {participant.is_opportunity && (
                        <Badge variant="success">Oport.</Badge>
                      )}
                      {participant.hasSale && (
                        <Badge variant="success">Vendido</Badge>
                      )}
                    </div>
                    {(participant.color || getColorFromRevenue(participant.revenue)) && (
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-0.5 ${getColorClass(participant.color || getColorFromRevenue(participant.revenue))}`}>
                        {(participant.color || getColorFromRevenue(participant.revenue)) === 'rosa' && 'Rosa'}
                        {(participant.color || getColorFromRevenue(participant.revenue)) === 'preto' && 'Preto'}
                        {(participant.color || getColorFromRevenue(participant.revenue)) === 'azul_claro' && 'Azul Claro'}
                        {(participant.color || getColorFromRevenue(participant.revenue)) === 'verde' && 'Verde'}
                        {(participant.color || getColorFromRevenue(participant.revenue)) === 'dourado' && 'Dourado'}
                        {(participant.color || getColorFromRevenue(participant.revenue)) === 'laranja' && 'Laranja'}
                      </span>
                    )}
                    {/* Mobile: show extra info below name */}
                    <div className="sm:hidden text-xs text-gray-500 mt-0.5 space-y-0.5">
                      {participant.revenue && <p>Faturamento: {participant.revenue}</p>}
                      {companionName && <p>Acomp.: {companionName}</p>}
                    </div>
                  </div>
                </div>
                {/* Revenue */}
                <div className="hidden sm:block min-w-0">
                  <span className="text-sm text-gray-700 truncate block">{participant.revenue || '—'}</span>
                </div>
                {/* Companion */}
                <div className="hidden sm:block min-w-0">
                  <span className="text-sm text-gray-700 truncate block">{companionName || '—'}</span>
                </div>
                {/* Check-in */}
                <div className="hidden sm:block">
                  <span className="text-xs text-gray-600">
                    {[
                      participant.checked_in_day1 && 'D1',
                      participant.checked_in_day2 && 'D2',
                      participant.checked_in_day3 && 'D3',
                    ].filter(Boolean).join(', ') || 'Nenhum'}
                  </span>
                </div>
                {/* Times called */}
                <div className="flex items-center justify-center gap-1">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <span className="text-sm text-gray-600">{participant.times_called || 0}x</span>
                </div>
              </div>
            )})}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredParticipants.length)} de {filteredParticipants.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {'<<'}
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {'<'}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      typeof p === 'string' ? (
                        <span key={`dots-${i}`} className="px-1 text-xs text-gray-400">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-2 py-1 text-xs rounded border ${
                            currentPage === p
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 bg-white hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {'>'}
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {'>>'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleParticipants.map((participant: any) => {
              const cardStatus = getParticipantCardStatus(participant, participant.hasSale)
              const companionName = participant.companion || findCompanionName(participant.webhook_data)
              return (
              <Card
                key={participant.id}
                className={cn(
                  'cursor-pointer hover:shadow-lg transition-shadow',
                  CARD_STATUS_STYLES[cardStatus]
                )}
                onClick={() => handleNavigate(participant.id)}
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    src={participant.photo_url}
                    alt={participant.name}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {participant.name}
                      </h3>
                      {participant.is_opportunity && (
                        <Badge variant="success">Oportunidade</Badge>
                      )}
                      {(participant.color || getColorFromRevenue(participant.revenue)) && (
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getColorClass(participant.color || getColorFromRevenue(participant.revenue))}`}>
                          {(participant.color || getColorFromRevenue(participant.revenue)) === 'rosa' && 'Rosa'}
                          {(participant.color || getColorFromRevenue(participant.revenue)) === 'preto' && 'Preto'}
                          {(participant.color || getColorFromRevenue(participant.revenue)) === 'azul_claro' && 'Azul Claro'}
                          {(participant.color || getColorFromRevenue(participant.revenue)) === 'verde' && 'Verde'}
                          {(participant.color || getColorFromRevenue(participant.revenue)) === 'dourado' && 'Dourado'}
                          {(participant.color || getColorFromRevenue(participant.revenue)) === 'laranja' && 'Laranja'}
                        </span>
                      )}
                    </div>
                    {companionName && (
                      <p className="text-sm text-gray-600">
                        Acompanhante: <span className="font-medium">{companionName}</span>
                      </p>
                    )}
                    {participant.revenue && (
                      <p className="text-sm text-gray-500">
                        Faturamento: {participant.revenue}
                      </p>
                    )}
                    {participant.niche && (
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getColorClass(
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
                        className="flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {participant.instagram}
                      </a>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Check-ins: {[
                      participant.checked_in_day1 && 'D1',
                      participant.checked_in_day2 && 'D2',
                      participant.checked_in_day3 && 'D3',
                    ].filter(Boolean).join(', ') || 'Nenhum'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1" title="Vezes chamado">
                      <Phone className="h-3 w-3" />
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
        )}

        {!loading && visibleCount < filteredParticipants.length && (
          <div className="flex justify-center pt-4">
            <Button
              variant="secondary"
              onClick={() => setVisibleCount(prev => prev + 30)}
            >
              Carregar mais ({filteredParticipants.length - visibleCount} restantes)
            </Button>
          </div>
        )}

        {!loading && filteredParticipants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum participante atribuído a você</p>
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}
