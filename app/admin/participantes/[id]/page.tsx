'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  Badge,
  Checkbox,
  Modal,
  Loading,
  useToast,
} from '@/components/ui'
import { ArrowLeft, ExternalLink, FileText, DollarSign, UserPlus } from 'lucide-react'
import { Participant, User, Form, Sale } from '@/lib/types'
import { getColorClass, getInstagramUrl, formatCurrency } from '@/lib/utils'

export default function ParticipantDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [closers, setClosers] = useState<User[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [assignCloserModal, setAssignCloserModal] = useState(false)
  const [saleModal, setSaleModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState({
    funnel: '',
    seller_closer_id: '',
    mentee_inviter: '',
    companion: '',
    is_opportunity: false,
    times_called: 0,
    color: '',
    qualification: '',
  })

  const [saleData, setSaleData] = useState({
    product: '',
    total_value: '',
    entry_value: '',
    negotiation_type: '',
  })

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    setLoading(true)

    const [participantRes, closersRes, formsRes, salesRes] = await Promise.all([
      supabase
        .from('participants')
        .select('*')
        .eq('id', params.id)
        .single(),
      supabase
        .from('users')
        .select('*')
        .eq('role', 'closer'),
      supabase
        .from('forms')
        .select('*')
        .eq('participant_id', params.id),
      supabase
        .from('sales')
        .select('*')
        .eq('participant_id', params.id),
    ])

    if (participantRes.data) {
      setParticipant(participantRes.data)
      setFormData({
        funnel: participantRes.data.funnel || '',
        seller_closer_id: participantRes.data.seller_closer_id || '',
        mentee_inviter: participantRes.data.mentee_inviter || '',
        companion: participantRes.data.companion || '',
        is_opportunity: participantRes.data.is_opportunity,
        times_called: participantRes.data.times_called,
        color: participantRes.data.color || '',
        qualification: participantRes.data.qualification || '',
      })
    }

    setClosers(closersRes.data || [])
    setForms(formsRes.data || [])
    setSales(salesRes.data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('participants')
        .update({
          funnel: formData.funnel || null,
          seller_closer_id: formData.seller_closer_id || null,
          mentee_inviter: formData.mentee_inviter || null,
          companion: formData.companion || null,
          is_opportunity: formData.is_opportunity,
          times_called: formData.times_called,
          color: formData.color || null,
          qualification: formData.qualification || null,
        })
        .eq('id', params.id)

      if (error) throw error

      showToast('Participante atualizado com sucesso', 'success')
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignCloser = async (closerId: string) => {
    setFormLoading(true)
    try {
      const { error } = await supabase
        .from('participants')
        .update({ assigned_closer_id: closerId })
        .eq('id', params.id)

      if (error) throw error

      showToast('Closer atribuído com sucesso', 'success')
      setAssignCloserModal(false)
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao atribuir closer', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleGenerateForm = async () => {
    setFormLoading(true)
    try {
      const formId = crypto.randomUUID()
      const { error } = await supabase.from('forms').insert({
        id: formId,
        participant_id: params.id as string,
        form_url: `/form/${formId}`,
      })

      if (error) throw error

      showToast('Formulário gerado com sucesso', 'success')
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao gerar formulário', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase.from('sales').insert({
        participant_id: params.id as string,
        closer_id: participant?.assigned_closer_id || user.id,
        product: saleData.product,
        total_value: parseFloat(saleData.total_value),
        entry_value: parseFloat(saleData.entry_value),
        negotiation_type: saleData.negotiation_type,
      })

      if (error) throw error

      showToast('Venda registrada com sucesso', 'success')
      setSaleModal(false)
      setSaleData({
        product: '',
        total_value: '',
        entry_value: '',
        negotiation_type: '',
      })
      fetchData()
    } catch (error: any) {
      showToast(error.message || 'Erro ao registrar venda', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Participante não encontrado</p>
        <Button variant="secondary" onClick={() => router.back()} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  const assignedCloser = closers.find(c => c.id === participant.assigned_closer_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{participant.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Webhook Data */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Webhook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 mb-6">
                <Avatar src={participant.photo_url} alt={participant.name} size="xl" />
                <div>
                  <h3 className="text-lg font-semibold">{participant.name}</h3>
                  {participant.revenue && (
                    <p className="text-gray-600">Faturamento: {participant.revenue}</p>
                  )}
                  {participant.niche && (
                    <span
                      className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${getColorClass(
                        participant.color
                      )}`}
                    >
                      {participant.niche}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Instagram:</span>
                  {participant.instagram ? (
                    <a
                      href={getInstagramUrl(participant.instagram) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {participant.instagram}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="ml-2 text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Credenciou Dia 1:</span>
                  <span className="ml-2">{participant.checked_in_day1 ? 'Sim' : 'Não'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Credenciou Dia 2:</span>
                  <span className="ml-2">{participant.checked_in_day2 ? 'Sim' : 'Não'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Credenciou Dia 3:</span>
                  <span className="ml-2">{participant.checked_in_day3 ? 'Sim' : 'Não'}</span>
                </div>
              </div>

              {participant.webhook_data && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Ver dados completos do webhook
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(participant.webhook_data, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          {/* Manual Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Campos Manuais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Funil de Origem"
                  value={formData.funnel}
                  onChange={(e) => setFormData({ ...formData, funnel: e.target.value })}
                />
                <Select
                  label="Vendedor/Convidador"
                  value={formData.seller_closer_id}
                  onChange={(e) => setFormData({ ...formData, seller_closer_id: e.target.value })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...closers.map(c => ({ value: c.id, label: c.name })),
                  ]}
                />
                <Input
                  label="Mentorado que Convidou"
                  value={formData.mentee_inviter}
                  onChange={(e) => setFormData({ ...formData, mentee_inviter: e.target.value })}
                />
                <Input
                  label="Acompanhante"
                  value={formData.companion}
                  onChange={(e) => setFormData({ ...formData, companion: e.target.value })}
                />
                <Select
                  label="Quantas Vezes Foi Chamado"
                  value={formData.times_called.toString()}
                  onChange={(e) => setFormData({ ...formData, times_called: parseInt(e.target.value) })}
                  options={[
                    { value: '0', label: '0' },
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                  ]}
                />
                <Select
                  label="Cor do Participante"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    { value: 'rosa', label: 'Rosa' },
                    { value: 'preto', label: 'Preto' },
                    { value: 'azul_claro', label: 'Azul Claro' },
                    { value: 'dourado', label: 'Dourado' },
                    { value: 'laranja', label: 'Laranja' },
                  ]}
                />
                <Select
                  label="Qualificação (apenas admin)"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    { value: 'super', label: 'Super Qualificado' },
                    { value: 'medio', label: 'Médio Qualificado' },
                    { value: 'baixo', label: 'Baixo Qualificado' },
                  ]}
                />
                <div className="flex items-center pt-6">
                  <Checkbox
                    id="is_opportunity"
                    label="É Oportunidade"
                    checked={formData.is_opportunity}
                    onChange={(e) => setFormData({ ...formData, is_opportunity: e.target.checked })}
                  />
                </div>
              </div>
              <div className="mt-6">
                <Button onClick={handleSave} loading={saving}>
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Forms and DISC Analysis */}
          {forms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Formulários e Análise DISC</CardTitle>
              </CardHeader>
              <CardContent>
                {forms.map((form) => (
                  <div key={form.id} className="border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-500">URL do Formulário:</p>
                        <a
                          href={form.form_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {typeof window !== 'undefined' ? window.location.origin : ''}{form.form_url}
                        </a>
                      </div>
                      {form.disc_profile && (
                        <Badge variant="info" className="text-lg px-4 py-2">
                          {form.disc_profile}
                        </Badge>
                      )}
                    </div>

                    {form.completed_at ? (
                      <div className="space-y-4">
                        {form.disc_description && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Descrição do Perfil</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{form.disc_description}</p>
                          </div>
                        )}
                        {form.sales_insights && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Insights para Vender</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{form.sales_insights}</p>
                          </div>
                        )}
                        {form.objections && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Objeções Prováveis</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{form.objections}</p>
                          </div>
                        )}
                        {form.objection_handling && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Como Contornar Objeções</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{form.objection_handling}</p>
                          </div>
                        )}
                        {form.closing_examples && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Exemplos de Fechamento</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{form.closing_examples}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">Aguardando resposta do participante...</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sales */}
          {sales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Vendas Realizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sales.map((sale) => (
                    <div key={sale.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Produto:</span>
                          <p className="font-medium">{sale.product}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Valor Total:</span>
                          <p className="font-medium">{formatCurrency(sale.total_value)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Valor Entrada:</span>
                          <p className="font-medium">{formatCurrency(sale.entry_value)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Negociação:</span>
                          <p className="font-medium">{sale.negotiation_type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Closer Atribuído</CardTitle>
            </CardHeader>
            <CardContent>
              {assignedCloser ? (
                <div className="flex items-center gap-3">
                  <Avatar src={assignedCloser.photo_url} alt={assignedCloser.name} />
                  <span className="font-medium">{assignedCloser.name}</span>
                </div>
              ) : (
                <p className="text-gray-500">Nenhum closer atribuído</p>
              )}
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setAssignCloserModal(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {assignedCloser ? 'Alterar Closer' : 'Atribuir Closer'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleGenerateForm}
                loading={formLoading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar Formulário
              </Button>
              <Button
                className="w-full"
                onClick={() => setSaleModal(true)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Venda Realizada
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Closer Modal */}
      <Modal
        isOpen={assignCloserModal}
        onClose={() => setAssignCloserModal(false)}
        title="Atribuir Closer"
      >
        <div className="space-y-3">
          {closers.map((closer) => (
            <button
              key={closer.id}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              onClick={() => handleAssignCloser(closer.id)}
            >
              <Avatar src={closer.photo_url} alt={closer.name} />
              <span className="font-medium">{closer.name}</span>
              {closer.id === participant.assigned_closer_id && (
                <Badge variant="success" className="ml-auto">Atual</Badge>
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Sale Modal */}
      <Modal
        isOpen={saleModal}
        onClose={() => setSaleModal(false)}
        title="Registrar Venda"
      >
        <form onSubmit={handleRegisterSale} className="space-y-4">
          <Input
            label="Produto Vendido"
            value={saleData.product}
            onChange={(e) => setSaleData({ ...saleData, product: e.target.value })}
            required
          />
          <Input
            label="Valor Total do Contrato"
            type="number"
            step="0.01"
            value={saleData.total_value}
            onChange={(e) => setSaleData({ ...saleData, total_value: e.target.value })}
            required
          />
          <Input
            label="Valor de Entrada"
            type="number"
            step="0.01"
            value={saleData.entry_value}
            onChange={(e) => setSaleData({ ...saleData, entry_value: e.target.value })}
            required
          />
          <Input
            label="Forma de Negociação"
            value={saleData.negotiation_type}
            onChange={(e) => setSaleData({ ...saleData, negotiation_type: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setSaleModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              Registrar Venda
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
