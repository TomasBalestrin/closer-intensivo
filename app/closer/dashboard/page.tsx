import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/shared'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { Award } from 'lucide-react'

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

    // Get all closers for top 3
    const { data: allClosers } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'closer')

    const { data: allSales } = await supabase
      .from('sales')
      .select('*')

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

    // Top 3 closers
    const closerStats = allClosers?.map(closer => {
      const closerSales = allSales?.filter(s => s.closer_id === closer.id) || []
      return {
        ...closer,
        salesCount: closerSales.length,
        totalValue: closerSales.reduce((sum, s) => sum + Number(s.total_value || 0), 0),
        entryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0),
      }
    }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 3) || []

    return {
      checkedInParticipants,
      checkedInOpportunities,
      salesCount,
      conversionRate,
      totalSalesValue,
      totalEntryValue,
      topClosers: closerStats,
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
      topClosers: [],
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

      {/* Top 3 Closers */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 3 Closers</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          {data.topClosers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum closer com vendas ainda</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {data.topClosers.map((closer, index) => (
                <div
                  key={closer.id}
                  className={`text-center p-4 rounded-lg ${
                    index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-50' : 'bg-orange-50'
                  }`}
                >
                  <div className="flex items-center justify-center mb-3">
                    <Award
                      className={`h-8 w-8 ${
                        index === 0
                          ? 'text-yellow-500'
                          : index === 1
                          ? 'text-gray-400'
                          : 'text-orange-500'
                      }`}
                    />
                    <span className="text-2xl font-bold ml-1">{index + 1}º</span>
                  </div>
                  <Avatar
                    src={closer.photo_url}
                    alt={closer.name}
                    size="xl"
                    className="mx-auto mb-3"
                  />
                  <h3 className="font-semibold text-gray-900">{closer.name}</h3>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-gray-600">
                      Vendas: <span className="font-medium">{closer.salesCount}</span>
                    </p>
                    <p className="text-gray-600">
                      Valor: <span className="font-medium">{formatCurrency(closer.totalValue)}</span>
                    </p>
                    <p className="text-gray-600">
                      Entrada: <span className="font-medium">{formatCurrency(closer.entryValue)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
