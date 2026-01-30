'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Card, Avatar, Badge } from '@/components/ui'
import { Search, Filter, ExternalLink, Phone } from 'lucide-react'
import { Participant } from '@/lib/types'
import { getColorClass, getColorFromRevenue, getInstagramUrl } from '@/lib/utils'
import { useDebounce } from '@/lib/hooks'
import { PullToRefresh } from '@/components/shared/pull-to-refresh'
import { ParticipantGridSkeleton } from '@/components/shared/skeleton'

export default function CloserParticipantes() {
  const router = useRouter()
  const supabase = createClient()
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [funnelFilter, setFunnelFilter] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('')
  const [saleFilter, setSaleFilter] = useState('')
  const [checkinFilter, setCheckinFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [participantsRes, salesRes] = await Promise.all([
      supabase
        .from('participants')
        .select('*')
        .eq('closer_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('sales')
        .select('participant_id'),
    ])

    const participantsWithSales = participantsRes.data?.map(p => ({
      ...p,
      hasSale: salesRes.data?.some(s => s.participant_id === p.id) || false,
    })) || []

    setParticipants(participantsWithSales)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Restore scroll position when coming back from detail page
  useEffect(() => {
    if (!loading) {
      const savedScroll = sessionStorage.getItem('closer-participantes-scroll')
      if (savedScroll) {
        const scrollY = parseInt(savedScroll, 10)
        sessionStorage.removeItem('closer-participantes-scroll')
        // Use setTimeout to ensure DOM is fully painted after React render
        const timer = setTimeout(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior })
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [loading])

  const handleNavigate = (participantId: string) => {
    const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
    sessionStorage.setItem('closer-participantes-scroll', String(scrollY))
    router.push(`/closer/participantes/${participantId}`)
  }

  const funnels = [...new Set(participants.map(p => p.funnel).filter(Boolean))]

  const filteredParticipants = participants.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchesFunnel = !funnelFilter || p.funnel === funnelFilter
    const matchesOpportunity = opportunityFilter === '' ||
      (opportunityFilter === 'true' ? p.is_opportunity : !p.is_opportunity)
    const matchesSale = saleFilter === '' ||
      (saleFilter === 'true' ? p.hasSale : !p.hasSale)
    const hasCheckin = p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
    const matchesCheckin = checkinFilter === '' ||
      (checkinFilter === 'true' ? hasCheckin : !hasCheckin)
    const matchesColor = !colorFilter || (p.color === colorFilter) || (getColorFromRevenue(p.revenue) === colorFilter)

    return matchesSearch && matchesFunnel && matchesOpportunity && matchesSale && matchesCheckin && matchesColor
  })

  return (
    <PullToRefresh onRefresh={fetchData}>
      <div className="space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Meus Participantes</h1>
          <span className="text-gray-500">{filteredParticipants.length} participantes</span>
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
            </div>
          )}
        </div>

        {/* Participants Grid */}
        {loading ? (
          <ParticipantGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParticipants.map((participant: any) => (
              <Card
                key={participant.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
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
            ))}
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
