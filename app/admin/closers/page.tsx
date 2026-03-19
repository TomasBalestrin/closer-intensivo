'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Avatar, Loading, Button } from '@/components/ui'
import { User, Sale, Participant } from '@/lib/types'
import { formatCurrency, formatPercentage, exportToCSV, getQualificationClass } from '@/lib/utils'
import { useEvent } from '@/lib/hooks/use-event'
import { Download } from 'lucide-react'

interface CloserWithStats extends User {
  participantsCount: number
  opportunitiesCheckedIn: number
  salesCount: number
  conversionRate: number
  totalSalesValue: number
  totalEntryValue: number
  qualAlto: number
  qualMedio: number
  qualBaixo: number
}

export default function AdminClosers() {
  const router = useRouter()
  const supabase = createClient()
  const { activeEvent, isLoading: eventLoading } = useEvent()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for event to be loaded before fetching data
    if (!eventLoading) {
      fetchData()
    }
  }, [activeEvent?.id, eventLoading])

  const [rawClosers, setRawClosers] = useState<User[]>([])
  const [rawParticipants, setRawParticipants] = useState<Participant[]>([])
  const [rawSales, setRawSales] = useState<Sale[]>([])

  const fetchData = async () => {
    setLoading(true)

    // Build queries with event filter
    let participantsQuery = supabase.from('participants').select('id, assigned_closer_id, seller_closer_id, is_opportunity, checked_in_day1, checked_in_day2, checked_in_day3, qualification')
    let salesQuery = supabase.from('sales').select('id, closer_id, total_value, entry_value').is('deleted_at', null)

    // Get ALL users with role 'closer' (from users table and user_events table)
    let closersData: User[] = []
    if (activeEvent?.id) {
      // Get closers from user_events for this event
      const { data: userEventsData } = await supabase
        .from('user_events')
        .select('user_id')
        .eq('event_id', activeEvent.id)
        .eq('role', 'closer')

      const eventCloserIds = new Set((userEventsData || []).map((ue: any) => ue.user_id))

      // Also get all users with role 'closer' from users table
      const { data: allClosersData } = await supabase
        .from('users')
        .select('id, name, email, photo_url, role')
        .eq('role', 'closer')

      // Merge: all users with role closer + any from user_events not already included
      const closersMap = new Map<string, User>()
      for (const c of (allClosersData || []) as User[]) {
        closersMap.set(c.id, c)
      }

      // If there are user_events closers whose users.role isn't 'closer', include them too
      if (eventCloserIds.size > 0) {
        const missingIds = [...eventCloserIds].filter(id => !closersMap.has(id))
        if (missingIds.length > 0) {
          const { data: extraClosers } = await supabase
            .from('users')
            .select('id, name, email, photo_url, role')
            .in('id', missingIds)
          for (const c of (extraClosers || []) as User[]) {
            closersMap.set(c.id, c)
          }
        }
      }

      closersData = Array.from(closersMap.values())
      participantsQuery = participantsQuery.eq('event_id', activeEvent.id)
      salesQuery = salesQuery.eq('event_id', activeEvent.id)
    } else {
      const { data } = await supabase.from('users').select('id, name, email, photo_url, role').eq('role', 'closer')
      closersData = (data || []) as User[]
    }

    const [participantsRes, salesRes] = await Promise.all([
      participantsQuery,
      salesQuery,
    ])

    setRawClosers(closersData)
    setRawParticipants(participantsRes.data as Participant[] || [])
    setRawSales(salesRes.data as Sale[] || [])
    setLoading(false)
  }

  const closersWithStats: CloserWithStats[] = useMemo(() => {
    // Index participants by assigned_closer_id or seller_closer_id for O(n) lookup
    const participantsByCloser = new Map<string, Participant[]>()
    rawParticipants.forEach(p => {
      const closerId = p.assigned_closer_id || p.seller_closer_id
      if (closerId) {
        const list = participantsByCloser.get(closerId) || []
        list.push(p)
        participantsByCloser.set(closerId, list)
      }
    })

    const salesByCloser = new Map<string, Sale[]>()
    rawSales.forEach(s => {
      if (s.closer_id) {
        const list = salesByCloser.get(s.closer_id) || []
        list.push(s)
        salesByCloser.set(s.closer_id, list)
      }
    })

    return rawClosers.map(closer => {
      const assignedParticipants = participantsByCloser.get(closer.id) || []
      const opportunities = assignedParticipants.filter(p => p.is_opportunity)
      const opportunitiesCheckedIn = opportunities.filter(
        p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
      ).length

      // Calculate opportunities per day and use max for conversion rate
      const oppDay1 = opportunities.filter(p => p.checked_in_day1).length
      const oppDay2 = opportunities.filter(p => p.checked_in_day2).length
      const oppDay3 = opportunities.filter(p => p.checked_in_day3).length
      const maxOpportunitiesPerDay = Math.max(oppDay1, oppDay2, oppDay3)

      const closerSales = salesByCloser.get(closer.id) || []
      const conversionRate = maxOpportunitiesPerDay > 0
        ? closerSales.length / maxOpportunitiesPerDay
        : 0

      return {
        ...closer,
        participantsCount: assignedParticipants.length,
        opportunitiesCheckedIn,
        salesCount: closerSales.length,
        conversionRate,
        totalSalesValue: closerSales.reduce((sum, s) => sum + Number(s.total_value), 0),
        totalEntryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value), 0),
        qualAlto: assignedParticipants.filter(p => (p as any).qualification === 'alto').length,
        qualMedio: assignedParticipants.filter(p => (p as any).qualification === 'medio').length,
        qualBaixo: assignedParticipants.filter(p => (p as any).qualification === 'baixo').length,
      }
    })
  }, [rawClosers, rawParticipants, rawSales])

  const handleExportCSV = () => {
    exportToCSV(closersWithStats, [
      { key: 'name', label: 'Nome' },
      { key: 'email', label: 'Email' },
      { key: 'participantsCount', label: 'Participantes' },
      { key: 'opportunitiesCheckedIn', label: 'Oportunidades' },
      { key: 'salesCount', label: 'Vendas' },
      { key: 'conversionRate', label: 'Taxa Conversão', format: (v) => formatPercentage(v) },
      { key: 'totalSalesValue', label: 'Valor Total Vendas', format: (v) => formatCurrency(v) },
      { key: 'totalEntryValue', label: 'Valor Total Entrada', format: (v) => formatCurrency(v) },
    ], 'closers')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Closers</h1>
        <Button variant="secondary" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {closersWithStats.map((closer) => (
          <Card
            key={closer.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/admin/closers/${closer.id}`)}
          >
            <div className="flex items-center gap-4 mb-4">
              <Avatar src={closer.photo_url} alt={closer.name} size="lg" />
              <div>
                <h3 className="font-semibold text-gray-900">{closer.name}</h3>
                <p className="text-sm text-gray-500">{closer.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Oportunidades</p>
                <p className="font-semibold">{closer.opportunitiesCheckedIn}</p>
              </div>
              <div>
                <p className="text-gray-500">Vendas</p>
                <p className="font-semibold">{closer.salesCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Conversão</p>
                <p className="font-semibold">{formatPercentage(closer.conversionRate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Valor Vendas</p>
                <p className="font-semibold">{formatCurrency(closer.totalSalesValue)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getQualificationClass('alto')}`}>
                Alto: {closer.qualAlto}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getQualificationClass('medio')}`}>
                Médio: {closer.qualMedio}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getQualificationClass('baixo')}`}>
                Baixo: {closer.qualBaixo}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t text-sm">
              <p className="text-gray-500">Valor de Entrada</p>
              <p className="font-semibold text-lg">{formatCurrency(closer.totalEntryValue)}</p>
            </div>
          </Card>
        ))}
      </div>

      {closersWithStats.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum closer encontrado</p>
        </div>
      )}
    </div>
  )
}
