'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { Award } from 'lucide-react'
import { User } from '@/lib/types'

type CloserWithStats = User & {
  salesCount: number
  totalValue: number
  entryValue: number
}

export default function TopClosersRealtime() {
  const [topClosers, setTopClosers] = useState<CloserWithStats[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchTopClosers = async () => {
    try {
      const [closersRes, salesRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'closer'),
        supabase.from('sales').select('*'),
      ])

      const allClosers = closersRes.data || []
      const allSales = salesRes.data || []

      const closerStats = allClosers.map(closer => {
        const closerSales = allSales.filter(s => s.closer_id === closer.id)
        return {
          ...closer,
          salesCount: closerSales.length,
          totalValue: closerSales.reduce((sum, s) => sum + Number(s.total_value || 0), 0),
          entryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0),
        }
      }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 3)

      setTopClosers(closerStats as CloserWithStats[])
    } catch (error) {
      console.error('Error fetching top closers:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTopClosers()
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('sales-realtime-closer')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        () => {
          fetchTopClosers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {topClosers.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nenhum closer com vendas ainda</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {topClosers.map((closer, index) => (
            <div
              key={closer.id}
              className={`text-center p-4 rounded-lg transition-all duration-300 ${
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
  )
}
