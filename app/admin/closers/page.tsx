'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Avatar, Loading, Button } from '@/components/ui'
import { User, Sale, Participant } from '@/lib/types'
import { formatCurrency, formatPercentage, exportToCSV } from '@/lib/utils'
import { useEvent } from '@/lib/hooks/use-event'
import { Download } from 'lucide-react'

interface CloserWithStats extends User {
  participantsCount: number
  opportunitiesCheckedIn: number
  salesCount: number
  conversionRate: number
  totalSalesValue: number
  totalEntryValue: number
}

export default function AdminClosers() {
  const router = useRouter()
  const supabase = createClient()
  const { activeEvent } = useEvent()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [activeEvent?.id])

  const [rawClosers, setRawClosers] = useState<User[]>([])
  const [rawParticipants, setRawParticipants] = useState<Participant[]>([])
  const [rawSales, setRawSales] = useState<Sale[]>([])

  const fetchData = async () => {
    setLoading(true)

    // Build queries with event filter
    let participantsQuery = supabase.from('participants').select('id, closer_id, is_opportunity, checked_in_day1, checked_in_day2, checked_in_day3')
    let salesQuery = supabase.from('sales').select('id, closer_id, total_value, entry_value').is('deleted_at', null)

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
          .select('id, name, email, photo_url, role')
          .in('id', userIds)
        closersData = (usersData || []) as User[]
      }
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
    // Index participants and sales by closer_id for O(n) lookup instead of O(n*m)
    const participantsByCloser = new Map<string, Participant[]>()
    rawParticipants.forEach(p => {
      if (p.closer_id) {
        const list = participantsByCloser.get(p.closer_id) || []
        list.push(p)
        participantsByCloser.set(p.closer_id, list)
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

      const closerSales = salesByCloser.get(closer.id) || []
      const conversionRate = opportunitiesCheckedIn > 0
        ? closerSales.length / opportunitiesCheckedIn
        : 0

      return {
        ...closer,
        participantsCount: assignedParticipants.length,
        opportunitiesCheckedIn,
        salesCount: closerSales.length,
        conversionRate,
        totalSalesValue: closerSales.reduce((sum, s) => sum + Number(s.total_value), 0),
        totalEntryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value), 0),
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
