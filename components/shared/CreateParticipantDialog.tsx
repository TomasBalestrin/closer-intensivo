'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Button,
  Input,
  Select,
  Modal,
  useToast,
} from '@/components/ui'
import { Plus } from 'lucide-react'
import { FATURAMENTO_OPTIONS, getColorFromRevenue, getQualificationFromRevenue, getColorClass, getQualificationClass } from '@/lib/utils'

interface CreateParticipantDialogProps {
  onSuccess: () => void
}

export function CreateParticipantDialog({ onSuccess }: CreateParticipantDialogProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    niche: '',
    revenue: '',
    badge_name: '',
    cpf: '',
    net_profit: '',
    partner: '',
    is_opportunity: false,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      instagram: '',
      niche: '',
      revenue: '',
      badge_name: '',
      cpf: '',
      net_profit: '',
      partner: '',
      is_opportunity: false,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || formData.name.length < 2) {
      showToast('Nome deve ter pelo menos 2 caracteres', 'error')
      return
    }

    setLoading(true)

    try {
      const color = getColorFromRevenue(formData.revenue)
      const qualification = getQualificationFromRevenue(formData.revenue)

      const { error } = await supabase.from('participants').insert({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        instagram: formData.instagram.trim() || null,
        niche: formData.niche.trim() || null,
        revenue: formData.revenue || null,
        badge_name: formData.badge_name.trim() || null,
        cpf: formData.cpf.trim() || null,
        net_profit: formData.net_profit.trim() || null,
        partner: formData.partner.trim() || null,
        is_opportunity: formData.is_opportunity,
        color: color,
        qualification: qualification,
      })

      if (error) throw error

      showToast('Participante criado com sucesso!', 'success')
      resetForm()
      setIsOpen(false)
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Erro ao criar participante', 'error')
    } finally {
      setLoading(false)
    }
  }

  const selectedColor = getColorFromRevenue(formData.revenue)
  const selectedQualification = getQualificationFromRevenue(formData.revenue)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Novo Participante
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          resetForm()
        }}
        title="Novo Participante"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome completo"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
            <Input
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
            <Input
              label="Instagram"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder="@usuario"
            />
            <Input
              label="Nicho"
              value={formData.niche}
              onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
              placeholder="Ex: Marketing Digital"
            />
            <Select
              label="Faturamento"
              value={formData.revenue}
              onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
              options={[
                { value: '', label: 'Selecione...' },
                ...FATURAMENTO_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
              ]}
            />
            <Input
              label="Nome no Crachá"
              value={formData.badge_name}
              onChange={(e) => setFormData({ ...formData, badge_name: e.target.value })}
              placeholder="Como quer ser chamado"
            />
            <Input
              label="CPF"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
            <Input
              label="Lucro Líquido"
              value={formData.net_profit}
              onChange={(e) => setFormData({ ...formData, net_profit: e.target.value })}
              placeholder="R$ 0.000,00"
            />
            <Input
              label="Sócio"
              value={formData.partner}
              onChange={(e) => setFormData({ ...formData, partner: e.target.value })}
              placeholder="Nome do sócio"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="create_is_opportunity"
              checked={formData.is_opportunity}
              onChange={(e) => setFormData({ ...formData, is_opportunity: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="create_is_opportunity" className="text-sm text-gray-700">
              Marcar como Oportunidade
            </label>
          </div>

          {formData.revenue && (
            <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Cor:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getColorClass(selectedColor)}`}>
                  {selectedColor?.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Qualificação:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getQualificationClass(selectedQualification)}`}>
                  {selectedQualification === 'alto' ? 'Alto' : selectedQualification === 'medio' ? 'Médio' : 'Baixo'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Criar Participante
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
