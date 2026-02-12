'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopClosers, TopCloserData } from '@/components/shared/top-closers'
import { CloserRankingTable } from '@/components/shared/closer-ranking-table'
import { useEvent } from '@/lib/hooks/use-event'

const supabase = createClient()

export default function TopClosersRealtime() {
  const { activeEvent } = useEvent()
  const [allClosers, setAllClosers] = useState<TopCloserData[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchRankings = useCallback(async () => {
    try {
      const url = activeEvent?.id
        ? `/api/rankings?event_id=${activeEvent.id}`
        : '/api/rankings'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch rankings')
      const { rankings } = await res.json()
      setAllClosers(rankings || [])
    } catch (error) {
      console.error('Error fetching rankings:', error)
    }
    setLoading(false)
  }, [activeEvent?.id])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  // Realtime subscription com debounce
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
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(fetchRankings, 1000)
        }
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchRankings])

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
