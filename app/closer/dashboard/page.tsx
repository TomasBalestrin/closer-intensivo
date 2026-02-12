'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/shared'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { useEvent } from '@/lib/hooks/use-event'
import TopClosersRealtime from './TopClosersRealtime'
import QuickActions from './QuickActions'
import { Loading } from '@/components/ui'

export default function CloserDashboard() {
  const supabase = createClient()
  const { activeEvent } = useEvent()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    checkedInParticipants: 0,
    checkedInOpportunities: 0,
    salesCount: 0,
    conversionRate: 0,
    totalSalesValue: 0,
    totalEntryValue: 0,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Build queries with event filter
      let participantsQuery = supabase
        .from('participants')
        .select('*')
        .eq('closer_id', user.id)

      let salesQuery = supabase
        .from('sales')
        .select('*')
        .eq('closer_id', user.id)
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

      const participants = participantsRes.data || []
      const sales = salesRes.data || []

      const checkedInParticipants = participants.filter(
        p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
      ).length

      const opportunities = participants.filter(p => p.is_opportunity)
      const checkedInOpportunities = opportunities.filter(
        p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
      ).length

      const totalSalesValue = sales.reduce((sum, s) => sum + Number(s.total_value || 0), 0)
      const totalEntryValue = sales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0)
      const salesCount = sales.length
      const conversionRate = checkedInOpportunities > 0 ? salesCount / checkedInOpportunities : 0

      setData({
        checkedInParticipants,
        checkedInOpportunities,
        salesCount,
        conversionRate,
        totalSalesValue,
        totalEntryValue,
      })
    } catch (error) {
      console.error('Error fetching closer dashboard data:', error)
    }
    setLoading(false)
  }, [activeEvent?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Meu Dashboard</h1>
        {activeEvent && (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
            {activeEvent.nome_evento}
          </span>
        )}
      </div>

      {/* Quick Actions - Mobile shortcuts */}
      <div className="lg:hidden">
        <QuickActions />
      </div>

      {/* Métricas Pessoais */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Minhas Métricas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Participantes Compareceram"
            value={data.checkedInParticipants}
            icon="Users"
          />
          <StatsCard
            title="Oportunidades Compareceram"
            value={data.checkedInOpportunities}
            icon="Target"
          />
          <StatsCard
            title="Vendas"
            value={data.salesCount}
            icon="DollarSign"
          />
          <StatsCard
            title="Taxa de Conversão"
            value={formatPercentage(data.conversionRate)}
            icon="TrendingUp"
          />
          <StatsCard
            title="Valor de Venda"
            value={formatCurrency(data.totalSalesValue)}
            icon="DollarSign"
          />
          <StatsCard
            title="Valor de Entrada"
            value={formatCurrency(data.totalEntryValue)}
            icon="DollarSign"
          />
        </div>
      </section>

      {/* Top 3 Closers - Realtime shared component */}
      <TopClosersRealtime />
    </div>
  )
}
