'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  Badge,
  Select,
  Loading,
} from '@/components/ui'
import { StatsCard } from '@/components/shared'
import { ArrowLeft, Users, Target, DollarSign, TrendingUp } from 'lucide-react'
import { User, Participant, Sale } from '@/lib/types'
import { formatCurrency, formatPercentage, getColorClass } from '@/lib/utils'

export default function CloserDetail() {
  const params = useParams()
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
  }, [params.id])

  const fetchData = async () => {
    setLoading(true)

    const [closerRes, participantsRes, salesRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', params.id).single(),
      supabase.from('participants').select('*').eq('assigned_closer_id', params.id),
      supabase.from('sales').select('*').eq('closer_id', params.id),
    ])

    setCloser(closerRes.data)
    setParticipants(participantsRes.data || [])
    setSales(salesRes.data || [])
    setLoading(false)
  }

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
        <p className="text-gray-500">Closer não encontrado</p>
        <Button variant="secondary" onClick={() => router.back()} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  const opportunities = participants.filter(p => p.is_opportunity)
  const opportunitiesDay1 = opportunities.filter(p => p.checked_in_day1).length
  const opportunitiesDay2 = opportunities.filter(p => p.checked_in_day2).length
  const opportunitiesDay3 = opportunities.filter(p => p.checked_in_day3).length
  const opportunitiesCheckedIn = opportunities.filter(
    p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
  ).length

  const superQualified = opportunities.filter(p => p.qualification === 'super').length
  const medioQualified = opportunities.filter(p => p.qualification === 'medio').length
  const baixoQualified = opportunities.filter(p => p.qualification === 'baixo').length

  const totalSalesValue = sales.reduce((sum, s) => sum + Number(s.total_value), 0)
  const totalEntryValue = sales.reduce((sum, s) => sum + Number(s.entry_value), 0)
  const conversionRate = opportunitiesCheckedIn > 0 ? sales.length / opportunitiesCheckedIn : 0

  const filteredParticipants = participants.filter(p => {
    if (participantFilter === 'day1') return p.checked_in_day1
    if (participantFilter === 'day2') return p.checked_in_day2
    if (participantFilter === 'day3') return p.checked_in_day3
    return true
  })

  const filteredOpportunities = opportunities.filter(p => {
    if (opportunityFilter === 'day1') return p.checked_in_day1
    if (opportunityFilter === 'day2') return p.checked_in_day2
    if (opportunityFilter === 'day3') return p.checked_in_day3
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Closer Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar src={closer.photo_url} alt={closer.name} size="xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{closer.name}</h1>
              <p className="text-gray-500">{closer.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Métricas Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Participantes Atribuídos"
            value={participants.length}
            icon={Users}
          />
          <StatsCard
            title="Oportunidades Compareceram"
            value={opportunitiesCheckedIn}
            icon={Target}
          />
          <StatsCard
            title="Vendas"
            value={sales.length}
            icon={DollarSign}
          />
          <StatsCard
            title="Taxa de Conversão"
            value={formatPercentage(conversionRate)}
            icon={TrendingUp}
          />
          <StatsCard
            title="Valor de Vendas"
            value={formatCurrency(totalSalesValue)}
            icon={DollarSign}
          />
          <StatsCard
            title="Valor de Entrada"
            value={formatCurrency(totalEntryValue)}
            icon={DollarSign}
          />
        </div>
      </section>

      {/* Qualification Stats (Admin only) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Qualificação das Oportunidades</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-green-800 font-medium">Super Qualificadas</p>
            <p className="text-2xl font-bold text-green-900">{superQualified}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-800 font-medium">Médio Qualificadas</p>
            <p className="text-2xl font-bold text-blue-900">{medioQualified}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-red-800 font-medium">Baixo Qualificadas</p>
            <p className="text-2xl font-bold text-red-900">{baixoQualified}</p>
          </div>
        </div>
      </section>

      {/* Participants List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Participantes Atribuídos</h2>
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
              onClick={() => router.push(`/admin/participantes/${participant.id}`)}
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
            Oportunidades ({opportunities.length})
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
            <p className="text-xl font-bold">{opportunitiesDay1}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-500">Dia 2</p>
            <p className="text-xl font-bold">{opportunitiesDay2}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-500">Dia 3</p>
            <p className="text-xl font-bold">{opportunitiesDay3}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOpportunities.map((participant) => (
            <Card
              key={participant.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/admin/participantes/${participant.id}`)}
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
