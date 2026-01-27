'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Card, Avatar, Badge, Loading } from '@/components/ui'
import { Search, Filter, ExternalLink } from 'lucide-react'
import { Participant } from '@/lib/types'
import { getColorClass, getInstagramUrl } from '@/lib/utils'

export default function CloserParticipantes() {
  const router = useRouter()
  const supabase = createClient()
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [funnelFilter, setFunnelFilter] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('')
  const [saleFilter, setSaleFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
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
  }

  const funnels = [...new Set(participants.map(p => p.funnel).filter(Boolean))]

  const filteredParticipants = participants.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesFunnel = !funnelFilter || p.funnel === funnelFilter
    const matchesOpportunity = opportunityFilter === '' ||
      (opportunityFilter === 'true' ? p.is_opportunity : !p.is_opportunity)
    const matchesSale = saleFilter === '' ||
      (saleFilter === 'true' ? p.hasSale : !p.hasSale)

    return matchesSearch && matchesFunnel && matchesOpportunity && matchesSale
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Meus Participantes</h1>
        <span className="text-gray-500">{filteredParticipants.length} participantes</span>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
          </div>
        )}
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParticipants.map((participant: any) => (
          <Card
            key={participant.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/closer/participantes/${participant.id}`)}
          >
            <div className="flex items-start gap-4">
              <Avatar
                src={participant.photo_url}
                alt={participant.name}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {participant.name}
                  </h3>
                  {participant.is_opportunity && (
                    <Badge variant="success">Oportunidade</Badge>
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
                      participant.color
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
              {participant.hasSale && (
                <Badge variant="success">Vendido</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredParticipants.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum participante atribuído a você</p>
        </div>
      )}
    </div>
  )
}
