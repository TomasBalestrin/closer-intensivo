'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge, Loading } from '@/components/ui'
import { Event } from '@/lib/types'
import { Calendar, MapPin, Plus, Edit, Archive, RotateCcw, Users } from 'lucide-react'

export default function AdminEventos() {
  const router = useRouter()
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'ativo' | 'arquivado' | 'rascunho'>('todos')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('data_inicio', { ascending: false })

    setEvents(data || [])
    setLoading(false)
  }

  const handleArchive = async (eventId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'arquivado' ? 'ativo' : 'arquivado'

    await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId)

    fetchEvents()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="success">Ativo</Badge>
      case 'arquivado':
        return <Badge variant="default">Arquivado</Badge>
      case 'rascunho':
        return <Badge variant="warning">Rascunho</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const filteredEvents = filter === 'todos'
    ? events
    : events.filter(e => e.status === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Eventos</h1>
          <p className="text-gray-600">Crie e gerencie os eventos do sistema</p>
        </div>
        <Button
          onClick={() => router.push('/admin/eventos/novo')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['todos', 'ativo', 'arquivado', 'rascunho'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">{events.length}</p>
          <p className="text-sm text-gray-500">Total de Eventos</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-green-600">
            {events.filter(e => e.status === 'ativo').length}
          </p>
          <p className="text-sm text-gray-500">Eventos Ativos</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-500">
            {events.filter(e => e.status === 'arquivado').length}
          </p>
          <p className="text-sm text-gray-500">Arquivados</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-yellow-600">
            {events.filter(e => e.status === 'rascunho').length}
          </p>
          <p className="text-sm text-gray-500">Rascunhos</p>
        </Card>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Nenhum evento encontrado.</p>
          <Button onClick={() => router.push('/admin/eventos/novo')}>
            Criar Primeiro Evento
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Color indicator */}
                <div
                  className="w-2 h-16 rounded-full"
                  style={{ backgroundColor: event.cor_primaria }}
                />

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{event.nome_evento}</h3>
                    {getStatusBadge(event.status)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(event.data_inicio)} - {formatDate(event.data_fim)}
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {event.numero_dias}d
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.cidade ? `${event.cidade}, ${event.estado}` : event.local}
                    </div>
                    {event.capacidade_maxima && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.capacidade_maxima}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/admin/eventos/${event.id}`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleArchive(event.id, event.status)}
                  title={event.status === 'arquivado' ? 'Reativar' : 'Arquivar'}
                >
                  {event.status === 'arquivado' ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Back button */}
      <div className="pt-4">
        <Button variant="secondary" onClick={() => router.push('/eventos')}>
          Voltar para Seleção de Eventos
        </Button>
      </div>
    </div>
  )
}
