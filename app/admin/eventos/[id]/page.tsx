'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Input, Loading } from '@/components/ui'
import { Event } from '@/lib/types'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

export default function EditarEvento() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
    status: 'ativo' as 'ativo' | 'arquivado' | 'rascunho',
  })

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  const fetchEvent = async () => {
    setLoading(true)
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (event) {
      setFormData({
        nome_evento: event.nome_evento,
        slug: event.slug,
        data_inicio: event.data_inicio,
        data_fim: event.data_fim,
        local: event.local,
        cidade: event.cidade || '',
        estado: event.estado || '',
        descricao: event.descricao || '',
        capacidade_maxima: event.capacidade_maxima?.toString() || '',
        cor_primaria: event.cor_primaria,
        cor_secundaria: event.cor_secundaria,
        status: event.status,
      })
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
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
        })
        .eq('id', eventId)

      if (updateError) throw updateError

      router.push('/admin/eventos')
    } catch (err: any) {
      console.error('Error updating event:', err)
      setError(err.message || 'Erro ao atualizar evento')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      // Soft delete - just archive it
      await supabase
        .from('events')
        .update({ status: 'arquivado' })
        .eq('id', eventId)

      router.push('/admin/eventos')
    } catch (err: any) {
      console.error('Error deleting event:', err)
      setError(err.message || 'Erro ao arquivar evento')
    }
    setDeleting(false)
  }

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Evento</h1>
            <p className="text-gray-600">{formData.nome_evento}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Arquivar Evento?</h3>
            <p className="text-gray-600 mb-4">
              O evento será arquivado e não aparecerá mais na lista de eventos ativos.
              Os dados não serão excluídos.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Arquivando...' : 'Arquivar Evento'}
              </Button>
            </div>
          </Card>
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
                className="font-mono text-sm"
              />
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
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
