'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Loading } from '@/components/ui'
import { Event, User } from '@/lib/types'
import { Calendar, MapPin, Users, Plus, Settings, LogOut } from 'lucide-react'

const STORAGE_KEY = 'bethel_active_event_id'

export default function EventosPage() {
  const router = useRouter()
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const checkedActiveEvent = useRef(false)

  useEffect(() => {
    checkActiveEventAndFetch()
  }, [])

  const checkActiveEventAndFetch = async () => {
    // Check if there's already an active event in localStorage
    const storedEventId = localStorage.getItem(STORAGE_KEY)

    if (storedEventId && !checkedActiveEvent.current) {
      checkedActiveEvent.current = true

      // Validate the event still exists and is active
      const { data: event } = await supabase
        .from('events')
        .select('id, status')
        .eq('id', storedEventId)
        .eq('status', 'ativo')
        .single()

      if (event) {
        // Get user role to redirect to correct dashboard
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single()

          if (userData?.role === 'admin' || userData?.role === 'financeiro') {
            router.replace('/admin/dashboard')
          } else {
            router.replace('/closer/dashboard')
          }
          return
        }
      } else {
        // Event was archived or doesn't exist, clear storage
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    fetchData()
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(userData)

      // Get events user has access to
      const { data: userEvents } = await supabase
        .from('user_events')
        .select('event_id')
        .eq('user_id', authUser.id)

      const eventIds = userEvents?.map(ue => ue.event_id) || []

      if (eventIds.length > 0) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds)
          .eq('status', 'ativo')
          .order('data_inicio', { ascending: false })

        setEvents(eventsData || [])
      } else if (userData?.role === 'admin') {
        // Admin can see all active events
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'ativo')
          .order('data_inicio', { ascending: false })

        setEvents(eventsData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const handleSelectEvent = (event: Event) => {
    localStorage.setItem(STORAGE_KEY, event.id)

    // Redirect based on user role
    if (user?.role === 'admin' || user?.role === 'financeiro') {
      router.push('/admin/dashboard')
    } else {
      router.push('/closer/dashboard')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bethel Events</h1>
          <p className="text-gray-600">
            Olá, <span className="font-medium">{user?.name}</span>! Selecione um evento para continuar.
          </p>
        </div>

        {/* Admin Actions */}
        {user?.role === 'admin' && (
          <div className="flex justify-end mb-6 gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/eventos')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Gerenciar Eventos
            </Button>
            <Button
              onClick={() => router.push('/admin/eventos/novo')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Evento
            </Button>
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 ? (
          <Card className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhum evento disponível no momento.</p>
            {user?.role === 'admin' && (
              <Button onClick={() => router.push('/admin/eventos/novo')}>
                Criar Primeiro Evento
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-blue-500"
                onClick={() => handleSelectEvent(event)}
              >
                <div className="flex flex-col h-full">
                  {/* Event Header with Color */}
                  <div
                    className="h-2 -mx-4 -mt-4 mb-4 rounded-t-lg"
                    style={{ backgroundColor: event.cor_primaria }}
                  />

                  {/* Event Info */}
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {event.nome_evento}
                  </h2>

                  <div className="space-y-2 text-sm text-gray-600 flex-grow">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {formatDate(event.data_inicio)} - {formatDate(event.data_fim)}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {event.numero_dias} dias
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{event.local}</span>
                    </div>

                    {event.cidade && event.estado && (
                      <div className="flex items-center gap-2 pl-6">
                        <span className="text-gray-500">
                          {event.cidade}, {event.estado}
                        </span>
                      </div>
                    )}

                    {event.capacidade_maxima && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>Capacidade: {event.capacidade_maxima} participantes</span>
                      </div>
                    )}
                  </div>

                  {event.descricao && (
                    <p className="text-sm text-gray-500 mt-4 line-clamp-2">
                      {event.descricao}
                    </p>
                  )}

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t">
                    <Button className="w-full" style={{ backgroundColor: event.cor_primaria }}>
                      Entrar no Evento
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Logout */}
        <div className="text-center mt-8">
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              localStorage.removeItem(STORAGE_KEY)
              router.push('/login')
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}
