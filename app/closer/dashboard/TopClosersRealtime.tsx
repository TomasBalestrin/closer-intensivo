'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopClosers, TopCloserData } from '@/components/shared/top-closers'
import { CloserRankingTable } from '@/components/shared/closer-ranking-table'

const supabase = createClient()

export default function TopClosersRealtime() {
  const [allClosers, setAllClosers] = useState<TopCloserData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRankings = async () => {
    try {
      const res = await fetch('/api/rankings')
      if (!res.ok) throw new Error('Failed to fetch rankings')
      const { rankings } = await res.json()
      setAllClosers(rankings || [])
    } catch (error) {
      console.error('Error fetching rankings:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRankings()
  }, [])

  // Realtime subscription - refetch on any sales change
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
          fetchRankings()
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

  const topClosers = allClosers.slice(0, 3)

  return (
    <div className="space-y-6">
      <TopClosers closers={topClosers} />
      <CloserRankingTable closers={allClosers} />
    </div>
  )
}
