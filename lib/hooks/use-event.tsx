'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/lib/types'

const STORAGE_KEY = 'bethel_active_event_id'

interface EventContextType {
  activeEvent: Event | null
  setActiveEvent: (event: Event | null) => void
  clearActiveEvent: () => void
  isLoading: boolean
  events: Event[]
  refreshEvents: () => Promise<void>
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({ children }: { children: ReactNode }) {
  const [activeEvent, setActiveEventState] = useState<Event | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const refreshEvents = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'ativo')
        .order('data_inicio', { ascending: false })

      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }, [supabase])

  const loadActiveEvent = useCallback(async () => {
    setIsLoading(true)
    try {
      const storedEventId = localStorage.getItem(STORAGE_KEY)

      if (storedEventId) {
        const { data: event } = await supabase
          .from('events')
          .select('*')
          .eq('id', storedEventId)
          .eq('status', 'ativo')
          .single()

        if (event) {
          setActiveEventState(event)
        } else {
          // Event was archived or doesn't exist, clear storage
          localStorage.removeItem(STORAGE_KEY)
        }
      }

      await refreshEvents()
    } catch (error) {
      console.error('Error loading active event:', error)
      localStorage.removeItem(STORAGE_KEY)
    }
    setIsLoading(false)
  }, [supabase, refreshEvents])

  useEffect(() => {
    loadActiveEvent()
  }, [loadActiveEvent])

  const setActiveEvent = useCallback((event: Event | null) => {
    setActiveEventState(event)
    if (event) {
      localStorage.setItem(STORAGE_KEY, event.id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const clearActiveEvent = useCallback(() => {
    setActiveEventState(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <EventContext.Provider
      value={{
        activeEvent,
        setActiveEvent,
        clearActiveEvent,
        isLoading,
        events,
        refreshEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider')
  }
  return context
}

export function useActiveEventId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}
