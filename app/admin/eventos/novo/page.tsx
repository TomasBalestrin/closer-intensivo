'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Input } from '@/components/ui'
import { ArrowLeft, Save } from 'lucide-react'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function NovoEvento() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    nome_evento: '',
    slug: '',
    data_inicio: '',
    data_fim: '',
    local: '',
    cidade: '',
    estado: '',
    descricao: '',
    capacidade_maxima: '',
    cor_primaria: '#E8A838',
    cor_secundaria: '#1A1A2E',
    status: 'ativo' as const,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }

      // Auto-generate slug from name
      if (name === 'nome_evento') {
        updated.slug = slugify(value)
      }

      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Create event (name, start_date, end_date are NOT NULL columns)
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          name: formData.nome_evento,
          start_date: formData.data_inicio,
          end_date: formData.data_fim,
          nome_evento: formData.nome_evento,
          slug: formData.slug,
          data_inicio: formData.data_inicio,
          data_fim: formData.data_fim,
          local: formData.local,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          descricao: formData.descricao || null,
          capacidade_maxima: formData.capacidade_maxima ? parseInt(formData.capacidade_maxima) : null,
          cor_primaria: formData.cor_primaria,
          cor_secundaria: formData.cor_secundaria,
          status: formData.status,
          created_by: user?.id,
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Create default funnels for this event
      const defaultFunnels = [
        { nome: 'Indicação Closer Base', slug: 'indicacao-closer-base', ordem: 1 },
        { nome: 'Indicação CS Base', slug: 'indicacao-cs-base', ordem: 2 },
        { nome: 'Indicação Elite Premium', slug: 'indicacao-elite-premium', ordem: 3 },
        { nome: 'Convidado Cleiton', slug: 'convidado-cleiton', ordem: 4 },
        { nome: 'Convidado Júlia', slug: 'convidado-julia', ordem: 5 },
        { nome: 'Mentorada Júlia', slug: 'mentorada-julia', ordem: 6 },
        { nome: 'Implementação Comercial', slug: 'implementacao-comercial', ordem: 7 },
        { nome: 'Implementação IA Bethel', slug: 'implementacao-ia-bethel', ordem: 8 },
        { nome: 'Implementação IA Next', slug: 'implementacao-ia-next', ordem: 9 },
        { nome: 'Bethel Club', slug: 'bethel-club', ordem: 10 },
        { nome: 'Elite Premium', slug: 'elite-premium', ordem: 11 },
        { nome: 'Aluna Base', slug: 'aluna-base', ordem: 12 },
      ]

      await supabase
        .from('funis_origem')
        .insert(defaultFunnels.map(f => ({ ...f, event_id: event.id })))

      // Give all existing closers access to this event
      const { data: users } = await supabase
        .from('users')
        .select('id, role')

      if (users && users.length > 0) {
        await supabase
          .from('user_events')
          .insert(users.map(u => ({
            user_id: u.id,
            event_id: event.id,
            role: u.role,
          })))
      }

      router.push('/admin/eventos')
    } catch (err: any) {
      console.error('Error creating event:', err)
      setError(err.message || 'Erro ao criar evento')
    }
    setSaving(false)
  }

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Evento</h1>
          <p className="text-gray-600">Preencha os dados para criar um novo evento</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Informações Básicas</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Evento *
              </label>
              <Input
                name="nome_evento"
                value={formData.nome_evento}
                onChange={handleChange}
                placeholder="Ex: Intensivo da Alta Performance - Março/26"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL)
              </label>
              <Input
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="Auto-gerado a partir do nome"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Identificador único para URLs. Gerado automaticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Início *
                </label>
                <Input
                  type="date"
                  name="data_inicio"
                  value={formData.data_inicio}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Término *
                </label>
                <Input
                  type="date"
                  name="data_fim"
                  value={formData.data_fim}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição do evento..."
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Local</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Local/Endereço *
              </label>
              <Input
                name="local"
                value={formData.local}
                onChange={handleChange}
                placeholder="Ex: Centro de Convenções Bethel"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <Input
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  placeholder="Ex: São Paulo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {estados.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacidade Máxima
              </label>
              <Input
                type="number"
                name="capacidade_maxima"
                value={formData.capacidade_maxima}
                onChange={handleChange}
                placeholder="Ex: 500"
                min="1"
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Aparência</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor Primária
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="cor_primaria"
                    value={formData.cor_primaria}
                    onChange={handleChange}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    name="cor_primaria"
                    value={formData.cor_primaria}
                    onChange={handleChange}
                    className="font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor Secundária
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="cor_secundaria"
                    value={formData.cor_secundaria}
                    onChange={handleChange}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    name="cor_secundaria"
                    value={formData.cor_secundaria}
                    onChange={handleChange}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Status</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status do Evento
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ativo">Ativo</option>
                <option value="rascunho">Rascunho</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Criar Evento'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
