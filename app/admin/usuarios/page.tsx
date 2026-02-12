'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Avatar, Loading, Button, Input, Select, Modal, Badge } from '@/components/ui'
import { User } from '@/lib/types'
import { Plus, UserPlus, Settings, Check, X } from 'lucide-react'
import { useEvent } from '@/lib/hooks/use-event'

interface UserWithEvents extends User {
  events: { id: string; name: string; nome_evento: string }[]
}

interface Event {
  id: string
  name: string
  nome_evento: string
  slug: string
  status: string
}

export default function AdminUsuarios() {
  const supabase = createClient()
  const { activeEvent } = useEvent()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserWithEvents[]>([])
  const [allEvents, setAllEvents] = useState<Event[]>([])

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEventsModal, setShowEventsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithEvents | null>(null)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'closer' as 'admin' | 'closer' | 'financeiro',
  })
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('name')

      // Fetch all events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name, nome_evento, slug, status')
        .order('data_inicio', { ascending: false })

      // Fetch user_events associations
      const { data: userEventsData } = await supabase
        .from('user_events')
        .select('user_id, event_id, events:event_id(id, name, nome_evento)')

      // Map users with their events
      const usersWithEvents = (usersData || []).map(user => {
        const userEventsList = (userEventsData || [])
          .filter(ue => ue.user_id === user.id)
          .map(ue => ue.events)
          .filter(Boolean)

        return {
          ...user,
          events: userEventsList,
        }
      })

      setUsers(usersWithEvents as UserWithEvents[])
      setAllEvents(eventsData || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      // Create user via API (needs server-side to use admin client)
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          event_id: activeEvent?.id, // Associate with current event
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erro ao criar usuário')

      setShowCreateModal(false)
      setNewUser({ name: '', email: '', password: '', role: 'closer' })
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário')
    }
    setCreating(false)
  }

  const openEventsModal = (user: UserWithEvents) => {
    setSelectedUser(user)
    setSelectedEventIds(user.events.map(e => e.id))
    setShowEventsModal(true)
  }

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleSaveEvents = async () => {
    if (!selectedUser) return
    setSaving(true)

    try {
      // Get current event IDs for this user
      const currentEventIds = selectedUser.events.map(e => e.id)

      // Events to add
      const toAdd = selectedEventIds.filter(id => !currentEventIds.includes(id))

      // Events to remove
      const toRemove = currentEventIds.filter(id => !selectedEventIds.includes(id))

      // Add new associations
      if (toAdd.length > 0) {
        await supabase
          .from('user_events')
          .insert(toAdd.map(eventId => ({
            user_id: selectedUser.id,
            event_id: eventId,
            role: selectedUser.role,
          })))
      }

      // Remove old associations
      if (toRemove.length > 0) {
        await supabase
          .from('user_events')
          .delete()
          .eq('user_id', selectedUser.id)
          .in('event_id', toRemove)
      }

      setShowEventsModal(false)
      setSelectedUser(null)
      fetchData()
    } catch (err) {
      console.error('Error saving events:', err)
    }
    setSaving(false)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default">Admin</Badge>
      case 'closer':
        return <Badge variant="success">Closer</Badge>
      case 'financeiro':
        return <Badge variant="warning">Financeiro</Badge>
      default:
        return <Badge>{role}</Badge>
    }
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 mt-1">Gerencie usuários e seus acessos aos eventos</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <Card key={user.id} className="relative">
            <div className="flex items-start gap-4">
              <Avatar src={user.photo_url} alt={user.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                  {getRoleBadge(user.role)}
                </div>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>

                {/* Events */}
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1">Eventos com acesso:</p>
                  {user.events.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.events.slice(0, 2).map(event => (
                        <span
                          key={event.id}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full truncate max-w-[150px]"
                          title={event.nome_evento || event.name}
                        >
                          {event.nome_evento || event.name}
                        </span>
                      ))}
                      {user.events.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{user.events.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Nenhum evento</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openEventsModal(user)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Gerenciar Eventos
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum usuário encontrado</p>
          <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
            Criar primeiro usuário
          </Button>
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Usuário"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Nome"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
          <Input
            label="Senha"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
            minLength={6}
          />
          <Select
            label="Tipo de Usuário"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
            options={[
              { value: 'closer', label: 'Closer' },
              { value: 'financeiro', label: 'Financeiro' },
              { value: 'admin', label: 'Administrador' },
            ]}
          />

          {activeEvent && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              O usuário será automaticamente associado ao evento atual: <strong>{activeEvent.nome_evento || activeEvent.name}</strong>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Events Modal */}
      <Modal
        isOpen={showEventsModal}
        onClose={() => setShowEventsModal(false)}
        title={`Eventos de ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Selecione os eventos que este usuário terá acesso:
          </p>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allEvents.map(event => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedEventIds.includes(event.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleEventSelection(event.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {event.nome_evento || event.name}
                    </p>
                    <p className="text-xs text-gray-500">{event.slug}</p>
                  </div>
                  {selectedEventIds.includes(event.id) ? (
                    <Check className="h-5 w-5 text-blue-600" />
                  ) : (
                    <div className="h-5 w-5 border-2 border-gray-300 rounded" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowEventsModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEvents} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
