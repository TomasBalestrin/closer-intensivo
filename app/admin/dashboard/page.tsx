import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/shared'
import { Users, UserCheck, Target, DollarSign, TrendingUp, Award } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { Participant, Sale, User } from '@/lib/types'

async function getDashboardData() {
  const supabase = await createClient()

  // Get all participants
  const { data: participantsData } = await supabase
    .from('participants')
    .select('*')

  // Get all sales with closer info
  const { data: salesData } = await supabase
    .from('sales')
    .select('*, closer:users(*)')

  // Get closers with their stats
  const { data: closersData } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'closer')

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

  // Qualification stats
  const superQualified = opportunities.filter(p => p.qualification === 'super')
  const medioQualified = opportunities.filter(p => p.qualification === 'medio')
  const baixoQualified = opportunities.filter(p => p.qualification === 'baixo')

  // Sales by qualification
  const getSalesByQualification = (qualification: string) => {
    const qualifiedParticipantIds = opportunities
      .filter(p => p.qualification === qualification)
      .map(p => p.id)
    return sales.filter(s => qualifiedParticipantIds.includes(s.participant_id))
  }

  const superSales = getSalesByQualification('super')
  const medioSales = getSalesByQualification('medio')
  const baixoSales = getSalesByQualification('baixo')

  // Top 3 closers by sales value
  const closerStats = closers.map(closer => {
    const closerSales = sales.filter(s => s.closer_id === closer.id)
    return {
      ...closer,
      salesCount: closerSales.length,
      totalValue: closerSales.reduce((sum, s) => sum + Number(s.total_value), 0),
      entryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value), 0),
    }
  }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 3) || []

  return {
    totalParticipants,
    checkedInDay1,
    checkedInDay2,
    checkedInDay3,
    totalOpportunities,
    oppDay1,
    oppDay2,
    oppDay3,
    superQualified: superQualified.length,
    medioQualified: medioQualified.length,
    baixoQualified: baixoQualified.length,
    superSales,
    medioSales,
    baixoSales,
    topClosers: closerStats,
  }
}

export default async function AdminDashboard() {
  const data = await getDashboardData()

  const calculateConversion = (sales: any[], opportunities: number) => {
    if (opportunities === 0) return 0
    return sales.length / opportunities
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>

      {/* Participantes */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Participantes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Participantes"
            value={data.totalParticipants}
            icon={Users}
          />
          <StatsCard
            title="Credenciaram Dia 1"
            value={data.checkedInDay1}
            subtitle={`${formatPercentage(data.checkedInDay1 / (data.totalParticipants || 1))} do total`}
            icon={UserCheck}
          />
          <StatsCard
            title="Credenciaram Dia 2"
            value={data.checkedInDay2}
            subtitle={`${formatPercentage(data.checkedInDay2 / (data.totalParticipants || 1))} do total`}
            icon={UserCheck}
          />
          <StatsCard
            title="Credenciaram Dia 3"
            value={data.checkedInDay3}
            subtitle={`${formatPercentage(data.checkedInDay3 / (data.totalParticipants || 1))} do total`}
            icon={UserCheck}
          />
        </div>
      </section>

      {/* Oportunidades */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Oportunidades</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Oportunidades"
            value={data.totalOpportunities}
            icon={Target}
          />
          <StatsCard
            title="Oportunidades Dia 1"
            value={data.oppDay1}
            subtitle={`${formatPercentage(data.oppDay1 / (data.totalOpportunities || 1))} do total`}
            icon={Target}
          />
          <StatsCard
            title="Oportunidades Dia 2"
            value={data.oppDay2}
            subtitle={`${formatPercentage(data.oppDay2 / (data.totalOpportunities || 1))} do total`}
            icon={Target}
          />
          <StatsCard
            title="Oportunidades Dia 3"
            value={data.oppDay3}
            subtitle={`${formatPercentage(data.oppDay3 / (data.totalOpportunities || 1))} do total`}
            icon={Target}
          />
        </div>
      </section>

      {/* Qualificação */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Por Qualificação</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Super Qualificadas */}
          <div className="bg-green-50 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-green-800">Super Qualificadas ({data.superQualified})</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Vendas</p>
                <p className="text-xl font-bold text-gray-900">{data.superSales.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Taxa de Conversão</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPercentage(calculateConversion(data.superSales, data.superQualified))}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Valor de Venda</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.superSales.reduce((sum, s) => sum + Number(s.total_value), 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Valor Entrada</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.superSales.reduce((sum, s) => sum + Number(s.entry_value), 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Médio Qualificadas */}
          <div className="bg-blue-50 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-blue-800">Médio Qualificadas ({data.medioQualified})</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Vendas</p>
                <p className="text-xl font-bold text-gray-900">{data.medioSales.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Taxa de Conversão</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPercentage(calculateConversion(data.medioSales, data.medioQualified))}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Valor de Venda</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.medioSales.reduce((sum, s) => sum + Number(s.total_value), 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Valor Entrada</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.medioSales.reduce((sum, s) => sum + Number(s.entry_value), 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Baixo Qualificadas */}
          <div className="bg-red-50 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-red-800">Baixo Qualificadas ({data.baixoQualified})</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Vendas</p>
                <p className="text-xl font-bold text-gray-900">{data.baixoSales.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Taxa de Conversão</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPercentage(calculateConversion(data.baixoSales, data.baixoQualified))}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Valor de Venda</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.baixoSales.reduce((sum, s) => sum + Number(s.total_value), 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Valor Entrada</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.baixoSales.reduce((sum, s) => sum + Number(s.entry_value), 0))}
                </p>
              </div>
            </div>
          </div>
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
