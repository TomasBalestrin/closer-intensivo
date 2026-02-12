'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { Loading } from '@/components/ui'
import { Participant, Sale, User } from '@/lib/types'
import { TopClosers } from '@/components/shared/top-closers'
import { CloserRankingTable } from '@/components/shared/closer-ranking-table'
import { useEvent } from '@/lib/hooks/use-event'
import { Users, Target, Calendar, TrendingUp, Percent, DollarSign, CreditCard } from 'lucide-react'

type DayFilter = 'todos' | 'dia1' | 'dia2' | 'dia3'

// Create supabase client outside component to avoid re-creation
const supabase = createClient()

export default function AdminDashboard() {
  const { activeEvent, isLoading: eventLoading } = useEvent()
  const [dayFilter, setDayFilter] = useState<DayFilter>('todos')
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [sales, setSales] = useState<(Sale & { closer: User })[]>([])
  const [closers, setClosers] = useState<User[]>([])

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      console.log('Dashboard fetchData - activeEvent:', activeEvent?.id, activeEvent?.nome_evento)

      // Build queries with event filter
      let participantsQuery = supabase.from('participants').select('id, name, email, niche, revenue, color, qualification, is_opportunity, checked_in_day1, checked_in_day2, checked_in_day3, closer_id')
      let salesQuery = supabase.from('sales').select('*, closer:users(id, name, photo_url)').is('deleted_at', null)

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
            .select('id, name, email, photo_url')
            .in('id', userIds)
          closersData = (usersData || []) as User[]
        }
      } else {
        const { data } = await supabase.from('users').select('id, name, email, photo_url').eq('role', 'closer')
        closersData = (data || []) as User[]
      }

      const [participantsRes, salesRes] = await Promise.all([
        participantsQuery,
        salesQuery,
      ])

      console.log('Dashboard results - participants:', participantsRes.data?.length, 'sales:', salesRes.data?.length)

      setParticipants((participantsRes.data || []) as Participant[])
      setSales((salesRes.data || []) as (Sale & { closer: User })[])
      setClosers(closersData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
    setLoading(false)
  }, [activeEvent?.id])

  useEffect(() => {
    // Wait for event to be loaded before fetching data
    if (!eventLoading) {
      fetchData()
    }
  }, [fetchData, eventLoading])

  // Realtime subscription com debounce para evitar múltiplos refetch
  useEffect(() => {
    const channel = supabase
      .channel('sales-changes-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => fetchData(false), 1000)
        }
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  // Memoize filtered data to prevent recalculations on every render
  const filteredParticipants = useMemo(() => {
    if (dayFilter === 'todos') return participants
    if (dayFilter === 'dia1') return participants.filter(p => p.checked_in_day1)
    if (dayFilter === 'dia2') return participants.filter(p => p.checked_in_day2)
    if (dayFilter === 'dia3') return participants.filter(p => p.checked_in_day3)
    return participants
  }, [participants, dayFilter])

  const opportunities = useMemo(() => filteredParticipants.filter(p => p.is_opportunity), [filteredParticipants])

  // Get sales for filtered participants
  const filteredSales = useMemo(() => {
    const participantIds = new Set(filteredParticipants.map(p => p.id))
    return sales.filter(s => participantIds.has(s.participant_id))
  }, [filteredParticipants, sales])

  // Stats calculations - memoized
  const stats = useMemo(() => {
    const totalParticipants = filteredParticipants.length
    const totalOpportunities = opportunities.length
    const totalSalesCount = filteredSales.length
    const conversionRate = totalOpportunities > 0 ? totalSalesCount / totalOpportunities : 0
    const totalSalesValue = filteredSales.reduce((sum, s) => sum + Number(s.total_value || 0), 0)
    const totalEntryValue = filteredSales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0)
    return { totalParticipants, totalOpportunities, totalSalesCount, conversionRate, totalSalesValue, totalEntryValue }
  }, [filteredParticipants, opportunities, filteredSales])

  // Qualification stats - memoized
  const qualificationStats = useMemo(() => {
    const altoQualified = opportunities.filter(p => p.qualification === 'alto')
    const medioQualified = opportunities.filter(p => p.qualification === 'medio')
    const baixoQualified = opportunities.filter(p => p.qualification === 'baixo')

    const getSalesByQualification = (qualification: string) => {
      const ids = new Set(opportunities.filter(p => p.qualification === qualification).map(p => p.id))
      return filteredSales.filter(s => ids.has(s.participant_id))
    }

    const altoSales = getSalesByQualification('alto')
    const medioSales = getSalesByQualification('medio')
    const baixoSales = getSalesByQualification('baixo')

    return { altoQualified, medioQualified, baixoQualified, altoSales, medioSales, baixoSales }
  }, [opportunities, filteredSales])

  const calcConversion = (salesArr: any[], oppCount: number) => oppCount === 0 ? 0 : salesArr.length / oppCount

  // All closers ranked - uses ALL sales (not filtered by day) so ranking is global and consistent across all dashboards
  const allClosersRanked = useMemo(() => {
    return closers.map(closer => {
      const closerSales = sales.filter(s => s.closer_id === closer.id)
      return {
        ...closer,
        salesCount: closerSales.length,
        totalValue: closerSales.reduce((sum, s) => sum + Number(s.total_value || 0), 0),
        entryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0),
      }
    }).sort((a, b) => b.totalValue - a.totalValue)
  }, [closers, sales])

  const { totalParticipants, totalOpportunities, totalSalesCount, conversionRate, totalSalesValue, totalEntryValue } = stats
  const { altoQualified, medioQualified, baixoQualified, altoSales, medioSales, baixoSales } = qualificationStats

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Day Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            {activeEvent && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
                {activeEvent.nome_evento}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">Visão geral do evento e performance de vendas</p>
        </div>

        {/* Day Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Calendar className="h-4 w-4 text-gray-500 ml-2" />
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'dia1', label: 'Dia 1' },
            { key: 'dia2', label: 'Dia 2' },
            { key: 'dia3', label: 'Dia 3' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDayFilter(key as DayFilter)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                dayFilter === key
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats Row - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Participantes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalParticipants}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Target className="h-4 w-4 text-amber-500" />
            <span className="text-sm">Oportunidades</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOpportunities}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm">Vendas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSalesCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Percent className="h-4 w-4 text-purple-500" />
            <span className="text-sm">Conversão</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPercentage(conversionRate)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span className="text-sm">Valor Vendas</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSalesValue)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <CreditCard className="h-4 w-4 text-indigo-500" />
            <span className="text-sm">Entradas</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalEntryValue)}</p>
        </div>
      </div>

      {/* Por Qualificação - Row Cards */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Por Qualificação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Alto Qualificadas */}
          <div className="bg-white rounded-xl border-l-4 border-l-emerald-500 border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-emerald-700">Alto Qualificadas</h3>
              <span className="text-2xl font-bold text-emerald-600">{altoQualified.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Vendas</p>
                <p className="text-lg font-bold text-gray-900">{altoSales.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Conversão</p>
                <p className="text-lg font-bold text-gray-900">{formatPercentage(calcConversion(altoSales, altoQualified.length))}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Valor</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(altoSales.reduce((s, x) => s + Number(x.total_value || 0), 0))}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Entrada</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(altoSales.reduce((s, x) => s + Number(x.entry_value || 0), 0))}</p>
              </div>
            </div>
          </div>

          {/* Médio Qualificadas */}
          <div className="bg-white rounded-xl border-l-4 border-l-amber-500 border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-amber-700">Médio Qualificadas</h3>
              <span className="text-2xl font-bold text-amber-600">{medioQualified.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Vendas</p>
                <p className="text-lg font-bold text-gray-900">{medioSales.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Conversão</p>
                <p className="text-lg font-bold text-gray-900">{formatPercentage(calcConversion(medioSales, medioQualified.length))}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Valor</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(medioSales.reduce((s, x) => s + Number(x.total_value || 0), 0))}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Entrada</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(medioSales.reduce((s, x) => s + Number(x.entry_value || 0), 0))}</p>
              </div>
            </div>
          </div>

          {/* Baixo Qualificadas */}
          <div className="bg-white rounded-xl border-l-4 border-l-red-500 border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-red-700">Baixo Qualificadas</h3>
              <span className="text-2xl font-bold text-red-600">{baixoQualified.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Vendas</p>
                <p className="text-lg font-bold text-gray-900">{baixoSales.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Conversão</p>
                <p className="text-lg font-bold text-gray-900">{formatPercentage(calcConversion(baixoSales, baixoQualified.length))}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Valor</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(baixoSales.reduce((s, x) => s + Number(x.total_value || 0), 0))}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Entrada</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(baixoSales.reduce((s, x) => s + Number(x.entry_value || 0), 0))}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Closers - shared component, same for all users */}
      <TopClosers closers={allClosersRanked.slice(0, 3)} />

      {/* Ranking Geral */}
      <CloserRankingTable closers={allClosersRanked} />
    </div>
  )
}
