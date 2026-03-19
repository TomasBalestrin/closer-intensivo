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
  Modal,
} from '@/components/ui'
import { StatsCard } from '@/components/shared'
import { ArrowLeft, X } from 'lucide-react'
import { User, Participant, Sale } from '@/lib/types'
import { formatCurrency, formatPercentage, getColorClass } from '@/lib/utils'
import { useEvent } from '@/lib/hooks/use-event'

interface SaleWithParticipant extends Sale {
  participant?: Participant
}

export default function CloserDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { activeEvent, isLoading: eventLoading } = useEvent()

  const [closer, setCloser] = useState<User | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [sales, setSales] = useState<SaleWithParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [showSalesModal, setShowSalesModal] = useState(false)

  const [participantFilter, setParticipantFilter] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('')

  useEffect(() => {
    if (!eventLoading) {
      fetchData()
    }
  }, [params.id, activeEvent?.id, eventLoading])

  const fetchData = async () => {
    setLoading(true)

    // Build queries with event filter
    let participantsQuery = supabase.from('participants').select('*').or(`seller_closer_id.eq.${params.id},assigned_closer_id.eq.${params.id}`)
    let salesQuery = supabase.from('sales').select('*, participant:participants(id, name, niche, email)').eq('closer_id', params.id).is('deleted_at', null)

    if (activeEvent?.id) {
      participantsQuery = participantsQuery.eq('event_id', activeEvent.id)
      salesQuery = salesQuery.eq('event_id', activeEvent.id)
    }

    const [closerRes, participantsRes, salesRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', params.id).single(),
      participantsQuery,
      salesQuery,
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

  // Use max opportunities per day for conversion rate calculation
  const maxOpportunitiesPerDay = Math.max(opportunitiesDay1, opportunitiesDay2, opportunitiesDay3)

  const altoQualified = participants.filter(p => p.qualification === 'alto').length
  const medioQualified = participants.filter(p => p.qualification === 'medio').length
  const baixoQualified = participants.filter(p => p.qualification === 'baixo').length

  const totalSalesValue = sales.reduce((sum, s) => sum + Number(s.total_value), 0)
  const totalEntryValue = sales.reduce((sum, s) => sum + Number(s.entry_value), 0)
  const conversionRate = maxOpportunitiesPerDay > 0 ? sales.length / maxOpportunitiesPerDay : 0

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
            icon="Users"
          />
          <StatsCard
            title="Oportunidades Compareceram"
            value={opportunitiesCheckedIn}
            icon="Target"
          />
          <div
            onClick={() => setShowSalesModal(true)}
            className="cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <StatsCard
              title="Vendas"
              value={sales.length}
              icon="DollarSign"
              subtitle="Clique para ver detalhes"
            />
          </div>
          <StatsCard
            title="Taxa de Conversão"
            value={formatPercentage(conversionRate)}
            icon="TrendingUp"
          />
          <StatsCard
            title="Valor de Vendas"
            value={formatCurrency(totalSalesValue)}
            icon="DollarSign"
          />
          <StatsCard
            title="Valor de Entrada"
            value={formatCurrency(totalEntryValue)}
            icon="DollarSign"
          />
        </div>
      </section>

      {/* Qualification Stats (Admin only) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Qualificação das Oportunidades</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-green-800 font-medium">Alto Qualificadas</p>
            <p className="text-2xl font-bold text-green-900">{altoQualified}</p>
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

      {/* Sales Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSalesModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                Vendas de {closer?.name} ({sales.length})
              </h2>
              <button
                onClick={() => setShowSalesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(80vh-80px)]">
              {sales.length === 0 ? (
                <p className="text-center text-gray-500 py-12">Nenhuma venda registrada</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Participante</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Nicho</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Valor Venda</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Valor Entrada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setShowSalesModal(false)
                          if (sale.participant?.id) {
                            router.push(`/admin/participantes/${sale.participant.id}`)
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <span className="text-blue-600 hover:underline font-medium">
                            {sale.participant?.name || 'Participante não encontrado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {sale.participant?.niche || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(Number(sale.total_value))}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(Number(sale.entry_value))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(totalSalesValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(totalEntryValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
