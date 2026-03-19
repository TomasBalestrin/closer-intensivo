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

  const refreshEvents = useCallback(async (): Promise<Event[]> => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setEvents([])
        return []
      }

      // Get user profile to check role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      let eventsData: Event[] = []

      if (userData?.role === 'admin') {
        // Admin can see all active events
        const { data } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'ativo')
          .order('data_inicio', { ascending: false })

        eventsData = data || []
      } else {
        // Non-admin: get events user has access to via user_events
        const { data: userEvents } = await supabase
          .from('user_events')
          .select('event_id')
          .eq('user_id', authUser.id)

        const eventIds = userEvents?.map(ue => ue.event_id) || []

        if (eventIds.length > 0) {
          const { data } = await supabase
            .from('events')
            .select('*')
            .in('id', eventIds)
            .eq('status', 'ativo')
            .order('data_inicio', { ascending: false })

          eventsData = data || []
        }
      }

      setEvents(eventsData)
      return eventsData
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    }
  }, [supabase])

  const loadActiveEvent = useCallback(async () => {
    setIsLoading(true)
    try {
      const storedEventId = localStorage.getItem(STORAGE_KEY)

      // First, refresh events to get user's accessible events
      const accessibleEvents = await refreshEvents()

      if (storedEventId) {
        // Check if stored event is still valid and accessible
        const storedEvent = accessibleEvents.find(e => e.id === storedEventId)

        if (storedEvent) {
          setActiveEventState(storedEvent)
        } else {
          // Event was archived, doesn't exist, or user lost access - clear storage
          localStorage.removeItem(STORAGE_KEY)

          // Auto-select the most recent accessible event
          if (accessibleEvents.length > 0) {
            const mostRecentEvent = accessibleEvents[0]
            setActiveEventState(mostRecentEvent)
            localStorage.setItem(STORAGE_KEY, mostRecentEvent.id)
          }
        }
      } else {
        // No stored event - auto-select the most recent accessible event
        if (accessibleEvents.length > 0) {
          const mostRecentEvent = accessibleEvents[0]
          setActiveEventState(mostRecentEvent)
          localStorage.setItem(STORAGE_KEY, mostRecentEvent.id)
        }
      }
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
