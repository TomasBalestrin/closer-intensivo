'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Modal, Card, Avatar, useToast, Loading } from '@/components/ui'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { User, UserRole, UserUpdate } from '@/lib/types'

export default function AdminPanel() {
  const supabase = createClient()
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'closer' as UserRole,
    photo_url: '',
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Erro ao carregar usuários', 'error')
    } else {
      setUsers((data || []) as User[])
    }
    setLoading(false)
  }

  const handleOpenModal = (user?: User) => {
    if (user) {
      setSelectedUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        photo_url: user.photo_url || '',
      })
    } else {
      setSelectedUser(null)
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'closer',
        photo_url: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'closer',
      photo_url: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      if (selectedUser) {
        // Update existing user
        const updateData: UserUpdate = {
          name: formData.name,
          role: formData.role,
          photo_url: formData.photo_url || null,
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', selectedUser.id)

        if (error) throw error

        // If password is provided, update it via API
        if (formData.password) {
          const response = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: selectedUser.id,
              password: formData.password,
            }),
          })

          if (!response.ok) {
            throw new Error('Erro ao atualizar senha')
          }
        }

        showToast('Usuário atualizado com sucesso', 'success')
      } else {
        // Create new user via API
        const response = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Erro ao criar usuário')
        }

        showToast('Usuário criado com sucesso', 'success')
      }

      handleCloseModal()
      fetchUsers()
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar usuário', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    setFormLoading(true)
    try {
      const response = await fetch('/api/auth/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id }),
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir usuário')
      }

      showToast('Usuário excluído com sucesso', 'success')
      setIsDeleteModalOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error: any) {
      showToast(error.message || 'Erro ao excluir usuário', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = !roleFilter || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Painel Admin</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: '', label: 'Todos os papéis' },
            { value: 'admin', label: 'Admin' },
            { value: 'closer', label: 'Closer' },
          ]}
          className="sm:w-48"
        />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="flex items-start gap-4">
            <Avatar src={user.photo_url} alt={user.name} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <span
                className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {user.role === 'admin' ? 'Admin' : 'Closer'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenModal(user)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedUser(user)
                  setIsDeleteModalOpen(true)
                }}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum usuário encontrado</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            id="email"
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={!!selectedUser}
          />
          <Input
            id="password"
            type="password"
            label={selectedUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!selectedUser}
          />
          <Select
            id="role"
            label="Papel"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            options={[
              { value: 'closer', label: 'Closer' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <Input
            id="photo_url"
            label="URL da Foto (opcional)"
            value={formData.photo_url}
            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              {selectedUser ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedUser(null)
        }}
        title="Confirmar Exclusão"
      >
        <p className="text-gray-600">
          Tem certeza que deseja excluir o usuário <strong>{selectedUser?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setIsDeleteModalOpen(false)
              setSelectedUser(null)
            }}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={formLoading}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}
