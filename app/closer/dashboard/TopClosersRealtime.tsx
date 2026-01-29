'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopClosers } from '@/components/shared/top-closers'
import { User } from '@/lib/types'

type CloserWithStats = User & {
  salesCount: number
  totalValue: number
  entryValue: number
}

const supabase = createClient()

export default function TopClosersRealtime() {
  const [topClosers, setTopClosers] = useState<CloserWithStats[]>([])
  const [loading, setLoading] = useState(true)

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </div>
    )
  }

  return <TopClosers closers={topClosers} />
}
