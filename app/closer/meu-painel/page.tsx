'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  Avatar,
  Badge,
  Select,
  Loading,
} from '@/components/ui'
import { StatsCard } from '@/components/shared'
import { User, Participant, Sale } from '@/lib/types'
import { formatCurrency, formatPercentage, getColorClass } from '@/lib/utils'

export default function MeuPainel() {
  const router = useRouter()
  const supabase = createClient()

  const [closer, setCloser] = useState<User | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const [participantFilter, setParticipantFilter] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [closerRes, participantsRes, salesRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('participants').select('*').eq('closer_id', user.id),
      supabase.from('sales').select('*').eq('closer_id', user.id).is('deleted_at', null),
    ])

    setCloser(closerRes.data)
    setParticipants(participantsRes.data || [])
    setSales(salesRes.data || [])
    setLoading(false)
  }

  const opportunities = useMemo(() => participants.filter(p => p.is_opportunity), [participants])

  const opportunityStats = useMemo(() => ({
    day1: opportunities.filter(p => p.checked_in_day1).length,
    day2: opportunities.filter(p => p.checked_in_day2).length,
    day3: opportunities.filter(p => p.checked_in_day3).length,
    checkedIn: opportunities.filter(
      p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
    ).length,
  }), [opportunities])

  const salesStats = useMemo(() => ({
    totalValue: sales.reduce((sum, s) => sum + Number(s.total_value), 0),
    entryValue: sales.reduce((sum, s) => sum + Number(s.entry_value), 0),
    conversionRate: opportunityStats.checkedIn > 0 ? sales.length / opportunityStats.checkedIn : 0,
  }), [sales, opportunityStats.checkedIn])

  const filteredParticipants = useMemo(() => participants.filter(p => {
    if (participantFilter === 'day1') return p.checked_in_day1
    if (participantFilter === 'day2') return p.checked_in_day2
    if (participantFilter === 'day3') return p.checked_in_day3
    return true
  }), [participants, participantFilter])

  const filteredOpportunities = useMemo(() => opportunities.filter(p => {
    if (opportunityFilter === 'day1') return p.checked_in_day1
    if (opportunityFilter === 'day2') return p.checked_in_day2
    if (opportunityFilter === 'day3') return p.checked_in_day3
    return true
  }), [opportunities, opportunityFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  if (!closer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar dados</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Closer Info */}
      <Card>
        <div className="flex items-center gap-4">
          <Avatar src={closer.photo_url} alt={closer.name} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{closer.name}</h1>
            <p className="text-gray-500">{closer.email}</p>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Minhas Métricas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Participantes Atribuídos"
            value={participants.length}
            icon="Users"
          />
          <StatsCard
            title="Oportunidades Compareceram"
            value={opportunityStats.checkedIn}
            icon="Target"
          />
          <StatsCard
            title="Vendas"
            value={sales.length}
            icon="DollarSign"
          />
          <StatsCard
            title="Taxa de Conversão"
            value={formatPercentage(salesStats.conversionRate)}
            icon="TrendingUp"
          />
          <StatsCard
            title="Valor de Vendas"
            value={formatCurrency(salesStats.totalValue)}
            icon="DollarSign"
          />
          <StatsCard
            title="Valor de Entrada"
            value={formatCurrency(salesStats.entryValue)}
            icon="DollarSign"
          />
        </div>
      </section>

      {/* Participants List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Meus Participantes</h2>
          <Select
            value={participantFilter}
            onChange={(e) => setParticipantFilter(e.target.value)}
            options={[
              { value: '', label: 'Todos' },
              { value: 'day1', label: 'Compareceram Dia 1' },
              { value: 'day2', label: 'Compareceram Dia 2' },
              { value: 'day3', label: 'Compareceram Dia 3' },
            ]}
            className="w-48"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParticipants.map((participant) => (
            <Card
              key={participant.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/closer/participantes/${participant.id}`)}
            >
              <div className="flex items-center gap-3">
                <Avatar src={participant.photo_url} alt={participant.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{participant.name}</p>
                  {participant.niche && (
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${getColorClass(
                        participant.color
                      )}`}
                    >
                      {participant.niche}
                    </span>
                  )}
                </div>
                {participant.is_opportunity && (
                  <Badge variant="success">Oportunidade</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
        {filteredParticipants.length === 0 && (
          <p className="text-center text-gray-500 py-8">Nenhum participante encontrado</p>
        )}
      </section>

      {/* Opportunities List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Minhas Oportunidades ({opportunities.length})
          </h2>
          <Select
            value={opportunityFilter}
            onChange={(e) => setOpportunityFilter(e.target.value)}
            options={[
              { value: '', label: 'Todas' },
              { value: 'day1', label: 'Compareceram Dia 1' },
              { value: 'day2', label: 'Compareceram Dia 2' },
              { value: 'day3', label: 'Compareceram Dia 3' },
            ]}
            className="w-48"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold">{opportunities.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-500">Dia 1</p>
            <p className="text-xl font-bold">{opportunityStats.day1}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-500">Dia 2</p>
            <p className="text-xl font-bold">{opportunityStats.day2}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-500">Dia 3</p>
            <p className="text-xl font-bold">{opportunityStats.day3}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOpportunities.map((participant) => (
            <Card
              key={participant.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/closer/participantes/${participant.id}`)}
            >
              <div className="flex items-center gap-3">
                <Avatar src={participant.photo_url} alt={participant.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{participant.name}</p>
                  <div className="flex gap-1 mt-1">
                    {participant.checked_in_day1 && <Badge variant="success">D1</Badge>}
                    {participant.checked_in_day2 && <Badge variant="success">D2</Badge>}
                    {participant.checked_in_day3 && <Badge variant="success">D3</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        {filteredOpportunities.length === 0 && (
          <p className="text-center text-gray-500 py-8">Nenhuma oportunidade encontrada</p>
        )}
      </section>
    </div>
  )
}
