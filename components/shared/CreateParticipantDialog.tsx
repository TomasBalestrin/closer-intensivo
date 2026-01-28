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

interface CreateParticipantDialogProps {
  onSuccess: () => void
}

// Mapeamento de faturamento para cor
const FATURAMENTO_OPTIONS = [
  { value: 'Até R$ 5.000,00', label: 'Até R$ 5.000,00', color: 'rosa' },
  { value: 'R$ 5.000,00 até R$ 10.000,00', label: 'R$ 5.000 a R$ 10.000', color: 'preto' },
  { value: 'R$ 10.000,00 até R$ 30.000,00', label: 'R$ 10.000 a R$ 30.000', color: 'azul_claro' },
  { value: 'R$ 30.000,00 até R$ 50.000,00', label: 'R$ 30.000 a R$ 50.000', color: 'dourado' },
  { value: 'R$ 50.000,00 até R$ 100.000,00', label: 'R$ 50.000 a R$ 100.000', color: 'laranja' },
  { value: 'Acima de R$ 100.000,00', label: 'Acima de R$ 100.000', color: 'verde' },
]

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

  const getColorFromRevenue = (revenue: string): string | null => {
    const option = FATURAMENTO_OPTIONS.find(opt => opt.value === revenue)
    return option?.color || null
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
              id="is_opportunity"
              checked={formData.is_opportunity}
              onChange={(e) => setFormData({ ...formData, is_opportunity: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_opportunity" className="text-sm text-gray-700">
              Marcar como Oportunidade
            </label>
          </div>

          {formData.revenue && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <span className="text-gray-500">Cor automática: </span>
              <span className="font-medium capitalize">{getColorFromRevenue(formData.revenue)?.replace('_', ' ')}</span>
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
