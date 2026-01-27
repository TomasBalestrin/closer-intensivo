'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Avatar, Loading } from '@/components/ui'
import { User, Sale, Participant } from '@/lib/types'
import { formatCurrency, formatPercentage } from '@/lib/utils'

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
  const [closers, setClosers] = useState<CloserWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const [closersRes, participantsRes, salesRes] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'closer'),
      supabase.from('participants').select('*'),
      supabase.from('sales').select('*'),
    ])

    const closersData = closersRes.data as User[] || []
    const participantsData = participantsRes.data as Participant[] || []
    const salesData = salesRes.data as Sale[] || []

    const closersWithStats: CloserWithStats[] = closersData.map(closer => {
      const assignedParticipants = participantsData.filter(
        p => p.assigned_closer_id === closer.id
      )

      const opportunities = assignedParticipants.filter(p => p.is_opportunity)
      const opportunitiesCheckedIn = opportunities.filter(
        p => p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3
      ).length

      const closerSales = salesData.filter(s => s.closer_id === closer.id)
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

    setClosers(closersWithStats)
    setLoading(false)
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
      <h1 className="text-2xl font-bold text-gray-900">Closers</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {closers.map((closer) => (
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

      {closers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum closer encontrado</p>
        </div>
      )}
    </div>
  )
}
