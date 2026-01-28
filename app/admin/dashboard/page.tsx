import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/shared'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { Participant, Sale, User } from '@/lib/types'
import { Trophy, Users, Target, Calendar, TrendingUp } from 'lucide-react'
import { CredenciamentoChart, QualificacaoChart, CloserPerformanceChart } from '@/components/shared'

async function getDashboardData() {
  try {
    const supabase = await createClient()

    const { data: participantsData } = await supabase.from('participants').select('*')
    const { data: salesData } = await supabase.from('sales').select('*, closer:users(*)')
    const { data: closersData } = await supabase.from('users').select('*').eq('role', 'closer')

    const participants = (participantsData || []) as Participant[]
    const sales = (salesData || []) as (Sale & { closer: User })[]
    const closers = (closersData || []) as User[]

    const totalParticipants = participants.length
    const checkedInDay1 = participants.filter(p => p.checked_in_day1).length
    const checkedInDay2 = participants.filter(p => p.checked_in_day2).length
    const checkedInDay3 = participants.filter(p => p.checked_in_day3).length

    const opportunities = participants.filter(p => p.is_opportunity)
    const totalOpportunities = opportunities.length
    const oppDay1 = opportunities.filter(p => p.checked_in_day1).length
    const oppDay2 = opportunities.filter(p => p.checked_in_day2).length
    const oppDay3 = opportunities.filter(p => p.checked_in_day3).length

    const superQualified = opportunities.filter(p => p.qualification === 'super')
    const medioQualified = opportunities.filter(p => p.qualification === 'medio')
    const baixoQualified = opportunities.filter(p => p.qualification === 'baixo')

    const getSalesByQualification = (qualification: string) => {
      const ids = opportunities.filter(p => p.qualification === qualification).map(p => p.id)
      return sales.filter(s => ids.includes(s.participant_id))
    }

    const superSales = getSalesByQualification('super')
    const medioSales = getSalesByQualification('medio')
    const baixoSales = getSalesByQualification('baixo')

    const closerStats = closers.map(closer => {
      const closerSales = sales.filter(s => s.closer_id === closer.id)
      return {
        ...closer,
        salesCount: closerSales.length,
        totalValue: closerSales.reduce((sum, s) => sum + Number(s.total_value || 0), 0),
        entryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0),
      }
    }).sort((a, b) => b.totalValue - a.totalValue)

    return {
      totalParticipants, checkedInDay1, checkedInDay2, checkedInDay3,
      totalOpportunities, oppDay1, oppDay2, oppDay3,
      superQualified: superQualified.length, medioQualified: medioQualified.length, baixoQualified: baixoQualified.length,
      superSales, medioSales, baixoSales,
      topClosers: closerStats.slice(0, 3),
      allClosers: closerStats,
      totalSales: sales.length,
      totalSalesValue: sales.reduce((sum, s) => sum + Number(s.total_value || 0), 0),
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return {
      totalParticipants: 0, checkedInDay1: 0, checkedInDay2: 0, checkedInDay3: 0,
      totalOpportunities: 0, oppDay1: 0, oppDay2: 0, oppDay3: 0,
      superQualified: 0, medioQualified: 0, baixoQualified: 0,
      superSales: [], medioSales: [], baixoSales: [],
      topClosers: [], allClosers: [], totalSales: 0, totalSalesValue: 0,
    }
  }
}

export default async function AdminDashboard() {
  const data = await getDashboardData()
  const calcConversion = (sales: any[], opp: number) => opp === 0 ? 0 : sales.length / opp

  const credenciamentoData = [
    { day: 'Dia 1', participantes: data.checkedInDay1, oportunidades: data.oppDay1 },
    { day: 'Dia 2', participantes: data.checkedInDay2, oportunidades: data.oppDay2 },
    { day: 'Dia 3', participantes: data.checkedInDay3, oportunidades: data.oppDay3 },
  ]

  const qualificacaoData = [
    { name: 'Super', value: data.superQualified, color: '#22c55e' },
    { name: 'Médio', value: data.medioQualified, color: '#3b82f6' },
    { name: 'Baixo', value: data.baixoQualified, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const closerChartData = data.allClosers.slice(0, 5).map(c => ({
    name: c.name.split(' ')[0],
    vendas: c.salesCount,
    valor: c.totalValue,
  }))

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-500 mt-1">Visão geral do evento e performance de vendas</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="stat-card-label">Participantes</p>
              <p className="stat-card-value">{data.totalParticipants}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Target className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="stat-card-label">Oportunidades</p>
              <p className="stat-card-value">{data.totalOpportunities}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="stat-card-label">Vendas</p>
              <p className="stat-card-value">{data.totalSales}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="stat-card-label">Valor Total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(data.totalSalesValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credenciamento */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Credenciamento por Dia</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total" value={data.totalParticipants} icon="Users" />
          <StatsCard title="Dia 1" value={data.checkedInDay1} subtitle={`${formatPercentage(data.checkedInDay1 / (data.totalParticipants || 1))} do total`} icon="UserCheck" />
          <StatsCard title="Dia 2" value={data.checkedInDay2} subtitle={`${formatPercentage(data.checkedInDay2 / (data.totalParticipants || 1))} do total`} icon="UserCheck" />
          <StatsCard title="Dia 3" value={data.checkedInDay3} subtitle={`${formatPercentage(data.checkedInDay3 / (data.totalParticipants || 1))} do total`} icon="UserCheck" />
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CredenciamentoChart data={credenciamentoData} />
        {qualificacaoData.length > 0 && <QualificacaoChart data={qualificacaoData} />}
      </div>

      {/* Oportunidades */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-800">Oportunidades por Dia</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total" value={data.totalOpportunities} icon="Target" />
          <StatsCard title="Dia 1" value={data.oppDay1} subtitle={`${formatPercentage(data.oppDay1 / (data.totalOpportunities || 1))} do total`} icon="Target" />
          <StatsCard title="Dia 2" value={data.oppDay2} subtitle={`${formatPercentage(data.oppDay2 / (data.totalOpportunities || 1))} do total`} icon="Target" />
          <StatsCard title="Dia 3" value={data.oppDay3} subtitle={`${formatPercentage(data.oppDay3 / (data.totalOpportunities || 1))} do total`} icon="Target" />
        </div>
      </section>

      {/* Qualificação */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Por Qualificação</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Super */}
          <div className="qual-card-super rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-green-800">Super Qualificadas</h3>
              <span className="text-2xl font-bold text-green-700">{data.superQualified}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Vendas</p><p className="text-xl font-bold">{data.superSales.length}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Conversão</p><p className="text-xl font-bold">{formatPercentage(calcConversion(data.superSales, data.superQualified))}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Valor</p><p className="text-lg font-bold">{formatCurrency(data.superSales.reduce((s, x) => s + Number(x.total_value || 0), 0))}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Entrada</p><p className="text-lg font-bold">{formatCurrency(data.superSales.reduce((s, x) => s + Number(x.entry_value || 0), 0))}</p></div>
            </div>
          </div>
          {/* Médio */}
          <div className="qual-card-medio rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-800">Médio Qualificadas</h3>
              <span className="text-2xl font-bold text-blue-700">{data.medioQualified}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Vendas</p><p className="text-xl font-bold">{data.medioSales.length}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Conversão</p><p className="text-xl font-bold">{formatPercentage(calcConversion(data.medioSales, data.medioQualified))}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Valor</p><p className="text-lg font-bold">{formatCurrency(data.medioSales.reduce((s, x) => s + Number(x.total_value || 0), 0))}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Entrada</p><p className="text-lg font-bold">{formatCurrency(data.medioSales.reduce((s, x) => s + Number(x.entry_value || 0), 0))}</p></div>
            </div>
          </div>
          {/* Baixo */}
          <div className="qual-card-baixo rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-red-800">Baixo Qualificadas</h3>
              <span className="text-2xl font-bold text-red-700">{data.baixoQualified}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Vendas</p><p className="text-xl font-bold">{data.baixoSales.length}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Conversão</p><p className="text-xl font-bold">{formatPercentage(calcConversion(data.baixoSales, data.baixoQualified))}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Valor</p><p className="text-lg font-bold">{formatCurrency(data.baixoSales.reduce((s, x) => s + Number(x.total_value || 0), 0))}</p></div>
              <div className="bg-white/50 rounded-lg p-3"><p className="text-gray-600">Entrada</p><p className="text-lg font-bold">{formatCurrency(data.baixoSales.reduce((s, x) => s + Number(x.entry_value || 0), 0))}</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Closers + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-800">TOP 3 Closers</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {data.topClosers.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum closer com vendas ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.topClosers.map((closer, i) => (
                  <div key={closer.id} className={`flex items-center gap-4 p-4 rounded-xl ${i === 0 ? 'bg-amber-50 border-2 border-amber-200' : i === 1 ? 'bg-gray-50 border border-gray-200' : 'bg-orange-50 border border-orange-200'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-500'}`}>{i + 1}</div>
                    <Avatar src={closer.photo_url} alt={closer.name} size="lg" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{closer.name}</h3>
                      <div className="flex gap-4 text-sm text-gray-600 mt-1">
                        <span>{closer.salesCount} vendas</span>
                        <span className="font-medium text-green-600">{formatCurrency(closer.totalValue)}</span>
                      </div>
                    </div>
                    {i === 0 && <Trophy className="h-8 w-8 text-amber-500" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        {closerChartData.length > 0 && <CloserPerformanceChart data={closerChartData} />}
      </div>
    </div>
  )
}
