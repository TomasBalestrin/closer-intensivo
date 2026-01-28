'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { Avatar, Loading } from '@/components/ui'
import { Participant, Sale, User } from '@/lib/types'
import { Trophy, Users, Target, Calendar, TrendingUp, Percent, DollarSign, CreditCard } from 'lucide-react'

type DayFilter = 'todos' | 'dia1' | 'dia2' | 'dia3'

export default function AdminDashboard() {
  const supabase = createClient()
  const [dayFilter, setDayFilter] = useState<DayFilter>('todos')
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [sales, setSales] = useState<(Sale & { closer: User })[]>([])
  const [closers, setClosers] = useState<User[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [participantsRes, salesRes, closersRes] = await Promise.all([
        supabase.from('participants').select('*'),
        supabase.from('sales').select('*, closer:users(*)'),
        supabase.from('users').select('*').eq('role', 'closer'),
      ])

      setParticipants((participantsRes.data || []) as Participant[])
      setSales((salesRes.data || []) as (Sale & { closer: User })[])
      setClosers((closersRes.data || []) as User[])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
    setLoading(false)
  }

  // Filter participants by day
  const getFilteredParticipants = () => {
    if (dayFilter === 'todos') return participants
    if (dayFilter === 'dia1') return participants.filter(p => p.checked_in_day1)
    if (dayFilter === 'dia2') return participants.filter(p => p.checked_in_day2)
    if (dayFilter === 'dia3') return participants.filter(p => p.checked_in_day3)
    return participants
  }

  const filteredParticipants = getFilteredParticipants()
  const opportunities = filteredParticipants.filter(p => p.is_opportunity)

  // Get sales for filtered participants
  const participantIds = filteredParticipants.map(p => p.id)
  const filteredSales = sales.filter(s => participantIds.includes(s.participant_id))

  // Stats calculations
  const totalParticipants = filteredParticipants.length
  const totalOpportunities = opportunities.length
  const totalSalesCount = filteredSales.length
  const conversionRate = totalOpportunities > 0 ? totalSalesCount / totalOpportunities : 0
  const totalSalesValue = filteredSales.reduce((sum, s) => sum + Number(s.total_value || 0), 0)
  const totalEntryValue = filteredSales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0)

  // Qualification stats
  const superQualified = opportunities.filter(p => p.qualification === 'super')
  const medioQualified = opportunities.filter(p => p.qualification === 'medio')
  const baixoQualified = opportunities.filter(p => p.qualification === 'baixo')

  const getSalesByQualification = (qualification: string) => {
    const ids = opportunities.filter(p => p.qualification === qualification).map(p => p.id)
    return filteredSales.filter(s => ids.includes(s.participant_id))
  }

  const superSales = getSalesByQualification('super')
  const medioSales = getSalesByQualification('medio')
  const baixoSales = getSalesByQualification('baixo')

  const calcConversion = (salesArr: any[], oppCount: number) => oppCount === 0 ? 0 : salesArr.length / oppCount

  // Top closers
  const closerStats = closers.map(closer => {
    const closerSales = filteredSales.filter(s => s.closer_id === closer.id)
    return {
      ...closer,
      salesCount: closerSales.length,
      totalValue: closerSales.reduce((sum, s) => sum + Number(s.total_value || 0), 0),
      entryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0),
    }
  }).sort((a, b) => b.totalValue - a.totalValue)

  const topClosers = closerStats.slice(0, 3)

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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Super Qualificadas */}
          <div className="bg-white rounded-xl border-l-4 border-l-emerald-500 border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-emerald-700">Super Qualificadas</h3>
              <span className="text-2xl font-bold text-emerald-600">{superQualified.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Vendas</p>
                <p className="text-lg font-bold text-gray-900">{superSales.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Conversão</p>
                <p className="text-lg font-bold text-gray-900">{formatPercentage(calcConversion(superSales, superQualified.length))}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Valor</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(superSales.reduce((s, x) => s + Number(x.total_value || 0), 0))}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Entrada</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(superSales.reduce((s, x) => s + Number(x.entry_value || 0), 0))}</p>
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

      {/* Top Closers */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-800">TOP 3 Closers</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {topClosers.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum closer com vendas ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topClosers.map((closer, i) => (
                <div key={closer.id} className={`flex items-center gap-4 p-4 rounded-xl ${i === 0 ? 'bg-amber-50 border-2 border-amber-200' : i === 1 ? 'bg-gray-50 border border-gray-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-500'}`}>{i + 1}</div>
                  <Avatar src={closer.photo_url} alt={closer.name} size="lg" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{closer.name}</h3>
                    <div className="flex flex-col text-sm text-gray-600 mt-1">
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
    </div>
  )
}
