'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Select, Card, CardHeader, CardTitle, CardContent, Loading } from '@/components/ui'
import {
  Users,
  UserCheck,
  Target,
  DollarSign,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Brain,
  Sparkles,
  Send,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { User } from '@/lib/types'
import {
  getColorClass,
  getColorFromRevenue,
  getQualificationFromRevenue,
  FATURAMENTO_OPTIONS,
  FUNIL_OPTIONS,
  normalizeRevenue,
} from '@/lib/utils'

type Participant = {
  id: string
  name: string
  email: string | null
  niche: string | null
  revenue: string | null
  funnel: string | null
  color: string | null
  qualification: string | null
  is_opportunity: boolean
  checked_in_day1: boolean
  checked_in_day2: boolean
  checked_in_day3: boolean
  closer_id: string | null
  challenge_answer: string | null
  desired_change_answer: string | null
  times_called: number
  disc_profile: string | null
  primary_archetype: string | null
}

export default function AdminRelatorios() {
  const supabase = createClient()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [closers, setClosers] = useState<User[]>([])
  const [salesMap, setSalesMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // Filters
  const [checkinFilter, setCheckinFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [funnelFilter, setFunnelFilter] = useState('')
  const [closerFilter, setCloserFilter] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // AI Analysis
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiSection, setShowAiSection] = useState(true)

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    qualification: true,
    revenue: true,
    niches: true,
    closers: true,
    opportunity: true,
    answers: true,
    ai: true,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [pRes, cRes, sRes] = await Promise.all([
      supabase.from('participants').select('*'),
      supabase.from('users').select('*').eq('role', 'closer'),
      supabase.from('sales').select('participant_id'),
    ])
    if (pRes.error) console.error('Participants error:', pRes.error)
    if (cRes.error) console.error('Closers error:', cRes.error)
    if (sRes.error) console.error('Sales error:', sRes.error)
    setParticipants((pRes.data || []) as any)
    setClosers(cRes.data || [])
    const map: Record<string, boolean> = {}
    sRes.data?.forEach(s => { map[s.participant_id] = true })
    setSalesMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Filtered participants
  const filtered = useMemo(() => {
    return participants.filter(p => {
      const pColor = p.color || getColorFromRevenue(p.revenue)
      const matchesCheckin = !checkinFilter ||
        (checkinFilter === 'day1' ? p.checked_in_day1 :
         checkinFilter === 'day2' ? p.checked_in_day2 :
         checkinFilter === 'day3' ? p.checked_in_day3 :
         checkinFilter === 'any' ? (p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3) :
         checkinFilter === 'none' ? (!p.checked_in_day1 && !p.checked_in_day2 && !p.checked_in_day3) : true)
      const matchesColor = !colorFilter || pColor === colorFilter
      const matchesFunnel = !funnelFilter || p.funnel === funnelFilter
      const matchesCloser = !closerFilter || (closerFilter === 'unassigned' ? !p.closer_id : p.closer_id === closerFilter)
      const matchesOpp = opportunityFilter === '' ||
        (opportunityFilter === 'true' ? p.is_opportunity : !p.is_opportunity)
      return matchesCheckin && matchesColor && matchesFunnel && matchesCloser && matchesOpp
    })
  }, [participants, checkinFilter, colorFilter, funnelFilter, closerFilter, opportunityFilter])

  const hasActiveFilters = checkinFilter || colorFilter || funnelFilter || closerFilter || opportunityFilter

  const clearFilters = () => {
    setCheckinFilter('')
    setColorFilter('')
    setFunnelFilter('')
    setCloserFilter('')
    setOpportunityFilter('')
  }

  // === COMPUTED STATS ===
  const stats = useMemo(() => {
    const total = filtered.length
    const checkedIn = filtered.filter(p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3).length
    const opportunities = filtered.filter(p => p.is_opportunity).length
    const withSale = filtered.filter(p => salesMap[p.id]).length
    const checkedD1 = filtered.filter(p => p.checked_in_day1).length
    const checkedD2 = filtered.filter(p => p.checked_in_day2).length
    const checkedD3 = filtered.filter(p => p.checked_in_day3).length

    // Qualification breakdown
    const qualBreakdown = { alto: 0, medio: 0, baixo: 0, sem: 0 }
    filtered.forEach(p => {
      const q = p.qualification || getQualificationFromRevenue(p.revenue)
      if (q === 'alto') qualBreakdown.alto++
      else if (q === 'medio') qualBreakdown.medio++
      else if (q === 'baixo') qualBreakdown.baixo++
      else qualBreakdown.sem++
    })

    // Revenue/color breakdown
    const colorBreakdown: Record<string, { count: number; opportunities: number; checkedIn: number; sales: number }> = {}
    const colorOrder = ['rosa', 'preto', 'azul_claro', 'verde', 'dourado', 'laranja']
    colorOrder.forEach(c => { colorBreakdown[c] = { count: 0, opportunities: 0, checkedIn: 0, sales: 0 } })
    colorBreakdown['sem'] = { count: 0, opportunities: 0, checkedIn: 0, sales: 0 }

    filtered.forEach(p => {
      const c = p.color || getColorFromRevenue(p.revenue) || 'sem'
      if (!colorBreakdown[c]) colorBreakdown[c] = { count: 0, opportunities: 0, checkedIn: 0, sales: 0 }
      colorBreakdown[c].count++
      if (p.is_opportunity) colorBreakdown[c].opportunities++
      if (p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3) colorBreakdown[c].checkedIn++
      if (salesMap[p.id]) colorBreakdown[c].sales++
    })

    // Niche breakdown
    const nicheMap: Record<string, { count: number; opportunities: number }> = {}
    filtered.forEach(p => {
      const n = p.niche?.trim() || 'Não informado'
      if (!nicheMap[n]) nicheMap[n] = { count: 0, opportunities: 0 }
      nicheMap[n].count++
      if (p.is_opportunity) nicheMap[n].opportunities++
    })
    const nicheRanking = Object.entries(nicheMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)

    // Closer breakdown
    const closerMap: Record<string, { name: string; total: number; checkedIn: number; opportunities: number; sales: number }> = {}
    closerMap['unassigned'] = { name: 'Sem closer', total: 0, checkedIn: 0, opportunities: 0, sales: 0 }
    closers.forEach(c => {
      closerMap[c.id] = { name: c.name, total: 0, checkedIn: 0, opportunities: 0, sales: 0 }
    })
    filtered.forEach(p => {
      const key = p.closer_id || 'unassigned'
      if (!closerMap[key]) closerMap[key] = { name: 'Desconhecido', total: 0, checkedIn: 0, opportunities: 0, sales: 0 }
      closerMap[key].total++
      if (p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3) closerMap[key].checkedIn++
      if (p.is_opportunity) closerMap[key].opportunities++
      if (salesMap[p.id]) closerMap[key].sales++
    })
    const closerRanking = Object.entries(closerMap)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total)

    // Opportunity by niche (for top nichos with opportunities)
    const oppByNiche = Object.entries(nicheMap)
      .filter(([, v]) => v.opportunities > 0)
      .sort((a, b) => b[1].opportunities - a[1].opportunities)
      .slice(0, 10)

    // Challenge answers word cloud (top words)
    const challengeAnswers = filtered
      .map(p => p.challenge_answer)
      .filter(Boolean) as string[]
    const desiredAnswers = filtered
      .map(p => p.desired_change_answer)
      .filter(Boolean) as string[]

    // Group common themes from answers
    const challengeThemes = groupThemes(challengeAnswers)
    const desiredThemes = groupThemes(desiredAnswers)

    return {
      total, checkedIn, opportunities, withSale,
      checkedD1, checkedD2, checkedD3,
      qualBreakdown, colorBreakdown, colorOrder,
      nicheRanking, closerRanking, oppByNiche,
      challengeAnswers, desiredAnswers,
      challengeThemes, desiredThemes,
    }
  }, [filtered, salesMap, closers])

  // Build context for AI
  const buildAiContext = () => {
    const lines: string[] = []
    lines.push(`Total de participantes (filtrados): ${stats.total}`)
    lines.push(`Credenciados: ${stats.checkedIn} (${pct(stats.checkedIn, stats.total)})`)
    lines.push(`Oportunidades: ${stats.opportunities} (${pct(stats.opportunities, stats.total)})`)
    lines.push(`Com venda: ${stats.withSale} (${pct(stats.withSale, stats.total)})`)
    lines.push(``)
    lines.push(`Qualificação: Alto=${stats.qualBreakdown.alto}, Médio=${stats.qualBreakdown.medio}, Baixo=${stats.qualBreakdown.baixo}, Sem info=${stats.qualBreakdown.sem}`)
    lines.push(``)
    lines.push(`Top 15 Nichos:`)
    stats.nicheRanking.slice(0, 15).forEach(([n, v], i) => {
      lines.push(`  ${i + 1}. ${n}: ${v.count} participantes, ${v.opportunities} oportunidades`)
    })
    lines.push(``)
    lines.push(`Distribuição por Cor/Faturamento:`)
    ;[...stats.colorOrder, 'sem'].forEach(c => {
      const v = stats.colorBreakdown[c]
      if (v && v.count > 0) {
        const label = colorLabel(c)
        lines.push(`  ${label}: ${v.count} (${v.opportunities} oport., ${v.checkedIn} cred., ${v.sales} vendas)`)
      }
    })
    lines.push(``)
    lines.push(`Distribuição por Closer:`)
    stats.closerRanking.forEach(([, v]) => {
      lines.push(`  ${v.name}: ${v.total} part., ${v.checkedIn} cred., ${v.opportunities} oport., ${v.sales} vendas`)
    })
    if (stats.challengeAnswers.length > 0) {
      lines.push(``)
      lines.push(`Principais dificuldades mencionadas (${stats.challengeAnswers.length} respostas):`)
      stats.challengeThemes.slice(0, 10).forEach(([theme, count]) => {
        lines.push(`  - "${theme}": ${count} menções`)
      })
      lines.push(``)
      lines.push(`Amostra de respostas sobre dificuldades:`)
      stats.challengeAnswers.slice(0, 15).forEach(a => {
        lines.push(`  - "${a.substring(0, 200)}"`)
      })
    }
    if (stats.desiredAnswers.length > 0) {
      lines.push(``)
      lines.push(`O que buscam no intensivo (${stats.desiredAnswers.length} respostas):`)
      stats.desiredThemes.slice(0, 10).forEach(([theme, count]) => {
        lines.push(`  - "${theme}": ${count} menções`)
      })
      lines.push(``)
      lines.push(`Amostra de respostas sobre o que buscam:`)
      stats.desiredAnswers.slice(0, 15).forEach(a => {
        lines.push(`  - "${a.substring(0, 200)}"`)
      })
    }
    return lines.join('\n')
  }

  const handleAiAnalysis = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    setAiResult('')
    try {
      const res = await fetch('/api/admin/reports/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          context: buildAiContext(),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiResult(data.result)
    } catch (err: any) {
      setAiResult(`Erro: ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  const quickPrompts = [
    { label: 'Análise completa de nichos', prompt: 'Faça uma análise completa dos nichos dos participantes. Identifique os nichos mais relevantes, agrupe nichos similares, calcule percentuais e dê insights sobre quais nichos têm maior potencial de conversão (considere taxa de oportunidade e vendas por nicho).' },
    { label: 'Dores e oportunidades', prompt: 'Analise as principais dificuldades e o que os participantes buscam no intensivo. Agrupe por temas recorrentes, identifique padrões e sugira como usar essas informações para maximizar vendas durante o evento.' },
    { label: 'Performance dos closers', prompt: 'Analise a performance de cada closer considerando: total de participantes, credenciados, oportunidades e vendas. Identifique os melhores performers e sugira redistribuição se necessário.' },
    { label: 'Perfil do comprador ideal', prompt: 'Com base nos dados de vendas, nichos, faturamento e qualificação, trace o perfil do comprador ideal deste evento. Quais características mais se correlacionam com vendas?' },
    { label: 'Estratégia por faixa de faturamento', prompt: 'Analise cada faixa de faturamento (cor) e sugira estratégias específicas de abordagem para cada uma. Considere as dores mencionadas e os gatilhos de decisão mais prováveis para cada perfil econômico.' },
    { label: 'Análise de credenciamento vs vendas', prompt: 'Analise a relação entre credenciamento (check-in por dia) e conversão em vendas. Qual dia tem mais impacto? Há participantes não credenciados que são oportunidades? Sugira ações para maximizar presença e conversão.' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Análises e insights sobre os participantes do evento</p>
        </div>
        <span className="text-sm text-gray-500">{filtered.length} participantes {hasActiveFilters ? '(filtrados)' : ''}</span>
      </div>

      {/* Filters */}
      <div className="sticky top-14 lg:top-0 z-20 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur-sm">
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && <span className="ml-2 px-1.5 py-0.5 bg-white/30 rounded text-xs">Ativo</span>}
        </Button>

        {showFilters && (
          <div className="mt-3 p-4 bg-white rounded-lg shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <Select
                label="Credenciamento"
                value={checkinFilter}
                onChange={(e) => setCheckinFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'day1', label: 'Credenciou Dia 1' },
                  { value: 'day2', label: 'Credenciou Dia 2' },
                  { value: 'day3', label: 'Credenciou Dia 3' },
                  { value: 'any', label: 'Credenciou qualquer dia' },
                  { value: 'none', label: 'Não credenciou' },
                ]}
              />
              <Select
                label="Cor (Faturamento)"
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todas as cores' },
                  { value: 'rosa', label: 'Rosa (até R$ 5k)' },
                  { value: 'preto', label: 'Preto (R$ 5k-10k)' },
                  { value: 'azul_claro', label: 'Azul Claro (R$ 10k-20k)' },
                  { value: 'verde', label: 'Verde (R$ 20k-50k)' },
                  { value: 'dourado', label: 'Dourado (R$ 50k-100k)' },
                  { value: 'laranja', label: 'Laranja (R$ 100k+)' },
                ]}
              />
              <Select
                label="Funil de Origem"
                value={funnelFilter}
                onChange={(e) => setFunnelFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos os funis' },
                  ...FUNIL_OPTIONS.filter(o => o.value !== '').map(o => ({ value: o.value, label: o.label })),
                ]}
              />
              <Select
                label="Closer Atribuído"
                value={closerFilter}
                onChange={(e) => setCloserFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'unassigned', label: 'Sem closer' },
                  ...closers.map(c => ({ value: c.id, label: c.name })),
                ]}
              />
              <Select
                label="É Oportunidade"
                value={opportunityFilter}
                onChange={(e) => setOpportunityFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'true', label: 'Sim' },
                  { value: 'false', label: 'Não' },
                ]}
              />
            </div>
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar Filtros</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <SectionHeader title="Resumo Geral" icon={BarChart3} sectionKey="summary" expanded={expandedSections.summary} onToggle={toggleSection} />
      {expandedSections.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Users} label="Total Participantes" value={stats.total} color="blue" />
          <StatCard icon={UserCheck} label="Credenciados" value={stats.checkedIn} subtitle={`${pct(stats.checkedIn, stats.total)} | D1: ${stats.checkedD1} D2: ${stats.checkedD2} D3: ${stats.checkedD3}`} color="green" />
          <StatCard icon={Target} label="Oportunidades" value={stats.opportunities} subtitle={pct(stats.opportunities, stats.total)} color="purple" />
          <StatCard icon={DollarSign} label="Com Venda" value={stats.withSale} subtitle={pct(stats.withSale, stats.total)} color="emerald" />
        </div>
      )}

      {/* Qualification Breakdown */}
      <SectionHeader title="Resumo de Qualificação" icon={TrendingUp} sectionKey="qualification" expanded={expandedSections.qualification} onToggle={toggleSection} />
      {expandedSections.qualification && (
        <Card>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700">Qualificação</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Quantidade</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">% do Total</th>
                    <th className="py-3 px-3 sm:px-4 font-semibold text-gray-700 w-1/3">Distribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Alto (R$ 50k+)', value: stats.qualBreakdown.alto, cls: 'bg-green-100 text-green-800', bar: 'bg-green-500' },
                    { label: 'Médio (R$ 10k-50k)', value: stats.qualBreakdown.medio, cls: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
                    { label: 'Baixo (até R$ 10k)', value: stats.qualBreakdown.baixo, cls: 'bg-red-100 text-red-800', bar: 'bg-red-500' },
                    { label: 'Sem informação', value: stats.qualBreakdown.sem, cls: 'bg-gray-100 text-gray-600', bar: 'bg-gray-400' },
                  ].map(row => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${row.cls}`}>{row.label}</span>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">{row.value}</td>
                      <td className="text-right py-3 px-4">{pct(row.value, stats.total)}</td>
                      <td className="py-3 px-4">
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${row.bar} rounded-full transition-all`} style={{ width: `${stats.total > 0 ? (row.value / stats.total) * 100 : 0}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="text-right py-3 px-4">{stats.total}</td>
                    <td className="text-right py-3 px-4">100%</td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue/Color Breakdown */}
      <SectionHeader title="Distribuição por Faturamento" icon={PieChart} sectionKey="revenue" expanded={expandedSections.revenue} onToggle={toggleSection} />
      {expandedSections.revenue && (
        <Card>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700">Faixa</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Qtd</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">%</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Oport.</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Cred.</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Vendas</th>
                    <th className="py-3 px-3 sm:px-4 w-1/5"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats.colorOrder, 'sem'].map(c => {
                    const v = stats.colorBreakdown[c]
                    if (!v || v.count === 0) return null
                    return (
                      <tr key={c} className="border-b last:border-0">
                        <td className="py-3 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${c !== 'sem' ? getColorClass(c) : 'bg-gray-200 text-gray-600'}`}>
                            {colorLabel(c)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-semibold">{v.count}</td>
                        <td className="text-right py-3 px-4">{pct(v.count, stats.total)}</td>
                        <td className="text-right py-3 px-4">{v.opportunities}</td>
                        <td className="text-right py-3 px-4">{v.checkedIn}</td>
                        <td className="text-right py-3 px-4">{v.sales}</td>
                        <td className="py-3 px-4">
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.total > 0 ? (v.count / stats.total) * 100 : 0}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Niches */}
      <SectionHeader title="Top Nichos" icon={BarChart3} sectionKey="niches" expanded={expandedSections.niches} onToggle={toggleSection} />
      {expandedSections.niches && (
        <Card>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700">#</th>
                    <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700">Nicho</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Qtd</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">%</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Oport.</th>
                    <th className="py-3 px-3 sm:px-4 w-1/4"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.nicheRanking.map(([niche, data], i) => (
                    <tr key={niche} className="border-b last:border-0">
                      <td className="py-3 px-4 text-gray-400 font-semibold">{i + 1}</td>
                      <td className="py-3 px-4 font-medium">{niche}</td>
                      <td className="text-right py-3 px-4 font-semibold">{data.count}</td>
                      <td className="text-right py-3 px-4">{pct(data.count, stats.total)}</td>
                      <td className="text-right py-3 px-4">{data.opportunities}</td>
                      <td className="py-3 px-4">
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.total > 0 ? (data.count / stats.total) * 100 : 0}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closer Distribution */}
      <SectionHeader title="Distribuição por Closer" icon={Users} sectionKey="closers" expanded={expandedSections.closers} onToggle={toggleSection} />
      {expandedSections.closers && (
        <Card>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700">Closer</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Total</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Cred.</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Oport.</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Vendas</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.closerRanking.map(([key, data]) => (
                    <tr key={key} className="border-b last:border-0">
                      <td className="py-3 px-4 font-medium">{data.name}</td>
                      <td className="text-right py-3 px-4 font-semibold">{data.total}</td>
                      <td className="text-right py-3 px-4">{data.checkedIn}</td>
                      <td className="text-right py-3 px-4">{data.opportunities}</td>
                      <td className="text-right py-3 px-4">{data.sales}</td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-semibold ${data.total > 0 && data.sales > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {pct(data.sales, data.total)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunity by Niche */}
      <SectionHeader title="Taxa de Oportunidade por Nicho" icon={Target} sectionKey="opportunity" expanded={expandedSections.opportunity} onToggle={toggleSection} />
      {expandedSections.opportunity && (
        <Card>
          <CardContent>
            <div className="mb-4 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                <strong>{stats.opportunities}</strong> de {stats.total} participantes são oportunidades ({pct(stats.opportunities, stats.total)})
              </p>
            </div>
            <div className="overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[440px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700">Nicho</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Oportunidades</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Total no nicho</th>
                    <th className="text-right py-3 px-3 sm:px-4 font-semibold text-gray-700">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.oppByNiche.map(([niche, data]) => (
                    <tr key={niche} className="border-b last:border-0">
                      <td className="py-3 px-4 font-medium">{niche}</td>
                      <td className="text-right py-3 px-4 font-semibold text-purple-600">{data.opportunities}</td>
                      <td className="text-right py-3 px-4">{data.count}</td>
                      <td className="text-right py-3 px-4 font-semibold">{pct(data.opportunities, data.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answers Analysis */}
      <SectionHeader title="Análise de Respostas dos Participantes" icon={MessageSquare} sectionKey="answers" expanded={expandedSections.answers} onToggle={toggleSection} />
      {expandedSections.answers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Challenge Answers */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700 text-base">
                Principal Dificuldade ({stats.challengeAnswers.length} respostas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.challengeThemes.length > 0 ? (
                <div className="space-y-2">
                  {stats.challengeThemes.slice(0, 12).map(([theme, count], i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <span className="text-sm text-gray-700 capitalize">{theme}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${stats.challengeAnswers.length > 0 ? (count / stats.challengeAnswers.length) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Nenhuma resposta registrada</p>
              )}
            </CardContent>
          </Card>

          {/* Desired Change Answers */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-700 text-base">
                O que Buscam no Intensivo ({stats.desiredAnswers.length} respostas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.desiredThemes.length > 0 ? (
                <div className="space-y-2">
                  {stats.desiredThemes.slice(0, 12).map(([theme, count], i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-700 capitalize">{theme}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${stats.desiredAnswers.length > 0 ? (count / stats.desiredAnswers.length) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Nenhuma resposta registrada</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Dynamic Analysis */}
      <SectionHeader title="Análise Dinâmica com IA" icon={Brain} sectionKey="ai" expanded={expandedSections.ai} onToggle={toggleSection} />
      {expandedSections.ai && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50/30 to-indigo-50/30">
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Use a IA para gerar análises combinatórias e insights estratégicos a partir dos dados filtrados.
              Escolha um prompt rápido ou escreva sua própria pergunta.
            </p>

            {/* Quick prompts */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin sm:flex-wrap sm:overflow-visible sm:pb-0">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => setAiPrompt(qp.prompt)}
                  className={`px-3 py-2 sm:py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px] ${
                    aiPrompt === qp.prompt
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Custom prompt */}
            <div className="flex flex-col sm:flex-row gap-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Escreva sua pergunta ou análise desejada... Ex: 'Quais nichos têm maior taxa de conversão entre os credenciados do Dia 1?'"
                rows={3}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
              />
              <Button
                onClick={handleAiAnalysis}
                disabled={aiLoading || !aiPrompt.trim()}
                className="self-stretch sm:self-end min-h-[44px]"
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Analisar
              </Button>
            </div>

            {/* AI Result */}
            {aiLoading && (
              <div className="flex items-center gap-3 p-6 bg-white rounded-lg border">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <span className="text-gray-600">Gerando análise com IA...</span>
              </div>
            )}
            {aiResult && !aiLoading && (
              <div className="p-4 sm:p-6 bg-white rounded-lg border prose prose-sm max-w-none overflow-x-auto">
                <div className="flex items-center gap-2 text-purple-700 font-semibold mb-3">
                  <Brain className="h-5 w-5 flex-shrink-0" />
                  Resultado da Análise
                </div>
                <div
                  className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(aiResult) }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// === HELPER COMPONENTS ===

function SectionHeader({ title, icon: Icon, sectionKey, expanded, onToggle }: {
  title: string; icon: any; sectionKey: string; expanded: boolean; onToggle: (key: string) => void
}) {
  return (
    <button
      onClick={() => onToggle(sectionKey)}
      className="w-full flex items-center justify-between py-2 group"
    >
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-500" />
        {title}
      </h2>
      {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, subtitle, color }: {
  icon: any; label: string; value: number; subtitle?: string; color: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <Card>
      <CardContent className="py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`p-1.5 sm:p-2 rounded-lg ${colorMap[color]} flex-shrink-0`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{label}</p>
            {subtitle && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 leading-tight">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// === HELPER FUNCTIONS ===

function pct(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

function colorLabel(c: string): string {
  const labels: Record<string, string> = {
    rosa: 'Rosa (até R$ 5k)',
    preto: 'Preto (R$ 5k-10k)',
    azul_claro: 'Azul Claro (R$ 10k-20k)',
    verde: 'Verde (R$ 20k-50k)',
    dourado: 'Dourado (R$ 50k-100k)',
    laranja: 'Laranja (R$ 100k+)',
    sem: 'Sem informação',
  }
  return labels[c] || c
}

function groupThemes(answers: string[]): [string, number][] {
  const keywords: Record<string, number> = {}
  const stopWords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na',
    'nos', 'nas', 'por', 'para', 'com', 'se', 'que', 'um', 'uma', 'mais', 'muito',
    'meu', 'minha', 'como', 'ter', 'ser', 'não', 'ao', 'à', 'é', 'eu', 'me',
    'isso', 'esse', 'essa', 'este', 'esta', 'já', 'também', 'mas', 'ou', 'ainda',
    'só', 'seu', 'sua', 'nos', 'ele', 'ela', 'nós', 'eles', 'elas', 'tem', 'foi',
    'são', 'está', 'estou', 'quando', 'onde', 'quem', 'qual', 'quais', 'toda',
    'todo', 'todas', 'todos', 'cada', 'mesmo', 'mesma', 'sobre', 'entre',
    'até', 'depois', 'antes', 'sem', 'nos', 'pela', 'pelo', 'pra', 'pro',
  ])

  answers.forEach(answer => {
    // Extract meaningful bigrams and trigrams
    const words = answer.toLowerCase()
      .replace(/[^\w\sáàãâéêíóôõúüç]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))

    // Count individual significant words
    words.forEach(w => {
      if (w.length > 3) {
        keywords[w] = (keywords[w] || 0) + 1
      }
    })

    // Count bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`
      keywords[bigram] = (keywords[bigram] || 0) + 1
    }
  })

  // Filter: keep bigrams with count >= 2, single words with count >= 3
  // Prefer bigrams over single words
  const bigramEntries = Object.entries(keywords)
    .filter(([k, v]) => k.includes(' ') && v >= 2)
    .sort((a, b) => b[1] - a[1])

  const singleEntries = Object.entries(keywords)
    .filter(([k, v]) => !k.includes(' ') && v >= 3)
    .sort((a, b) => b[1] - a[1])

  // Merge: bigrams first, then singles not already covered
  const result: [string, number][] = []
  const usedWords = new Set<string>()

  bigramEntries.forEach(([k, v]) => {
    result.push([k, v])
    k.split(' ').forEach(w => usedWords.add(w))
  })

  singleEntries.forEach(([k, v]) => {
    if (!usedWords.has(k)) {
      result.push([k, v])
    }
  })

  return result.slice(0, 20)
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4"><strong>$1.</strong> $2</li>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/\|(.+)\|/g, (match) => {
      // Basic table rendering
      const cells = match.split('|').filter(Boolean).map(c => c.trim())
      if (cells.every(c => /^[-:]+$/.test(c))) return '' // separator row
      const tag = cells.length > 0 ? 'td' : 'td'
      return `<tr>${cells.map(c => `<${tag} class="border px-3 py-1 text-sm">${c}</${tag}>`).join('')}</tr>`
    })
}
