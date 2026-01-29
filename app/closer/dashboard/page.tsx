import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/shared'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import TopClosersRealtime from './TopClosersRealtime'

async function getCloserDashboardData(closerId: string) {
  try {
    const supabase = await createClient()

    // Get participants assigned to this closer
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('closer_id', closerId)

    // Get sales by this closer
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('closer_id', closerId)

    const checkedInParticipants = participants?.filter(
      p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
    ).length || 0

    const opportunities = participants?.filter(p => p.is_opportunity) || []
    const checkedInOpportunities = opportunities.filter(
      p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
    ).length

    const totalSalesValue = sales?.reduce((sum, s) => sum + Number(s.total_value || 0), 0) || 0
    const totalEntryValue = sales?.reduce((sum, s) => sum + Number(s.entry_value || 0), 0) || 0
    const salesCount = sales?.length || 0
    const conversionRate = checkedInOpportunities > 0 ? salesCount / checkedInOpportunities : 0

    return {
      checkedInParticipants,
      checkedInOpportunities,
      salesCount,
      conversionRate,
      totalSalesValue,
      totalEntryValue,
    }
  } catch (error) {
    console.error('Error fetching closer dashboard data:', error)
    return {
      checkedInParticipants: 0,
      checkedInOpportunities: 0,
      salesCount: 0,
      conversionRate: 0,
      totalSalesValue: 0,
      totalEntryValue: 0,
    }
  }
}

export default async function CloserDashboard() {
  const supabase = await createClient()

  let authUser = null
  try {
    const { data } = await supabase.auth.getUser()
    authUser = data.user
  } catch {
    return null
  }

  if (!authUser) return null

  const data = await getCloserDashboardData(authUser.id)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Meu Dashboard</h1>

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
