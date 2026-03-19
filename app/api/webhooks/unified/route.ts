import { NextResponse } from 'next/server'
import {
  getWebhookSupabase,
  processParticipantWebhook,
  WebhookValidationError,
} from '@/lib/webhooks/process-participant'

export async function POST(request: Request) {
  const supabase = getWebhookSupabase()

  try {
    const payload = await request.json()

    // Log the webhook
    const { data: logData } = await supabase
      .from('webhooks_log')
      .insert({ payload, processed: false })
      .select('id')
      .single()
    const logId = logData?.id

    // Validate required structure
    if (!payload.event?.id) {
      return NextResponse.json(
        { error: 'Campo event.id é obrigatório' },
        { status: 400 }
      )
    }

    if (!payload.participant?.name && !payload.participant?.email) {
      return NextResponse.json(
        { error: 'Participante precisa ter name ou email' },
        { status: 400 }
      )
    }

    const eventId = payload.event.id

    // Validate event exists
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError || !eventData) {
      return NextResponse.json(
        { error: 'Evento não encontrado', event_id: eventId },
        { status: 400 }
      )
    }

    // Process webhook using shared module (structured format)
    const result = await processParticipantWebhook(supabase, payload, {
      eventId,
      structuredFormat: true,
    })

    if (logId) {
      await supabase.from('webhooks_log').update({ processed: true }).eq('id', logId)
    }

    const statusCode = result.action === 'created' ? 201 : 200
    return NextResponse.json({
      success: true,
      action: result.action,
      participantId: result.participantId,
      name: result.name,
      event_id: eventId,
      fieldsExtracted: result.fieldsExtracted,
    }, { status: statusCode })
  } catch (error: any) {
    console.error('Webhook error:', error)

    if (error instanceof WebhookValidationError) {
      return NextResponse.json(
        { error: error.message, ...error.details },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET for documentation
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Webhook unificado para importação de participantes com dados de credenciamento',
    endpoint: '/api/webhooks/unified',
    method: 'POST',
    estrutura: {
      event: {
        id: 'UUID do evento (obrigatório)',
        name: 'Nome do evento (opcional)',
      },
      timestamp: 'ISO timestamp (opcional)',
      event_type: 'Tipo do evento, ex: registration_updated (opcional)',
      participant: {
        id: 'ID externo do participante (usado para deduplicação)',
        name: 'Nome completo (obrigatório se não tiver email)',
        email: 'Email (obrigatório se não tiver nome)',
        setor: 'Setor/Nicho (opcional)',
        closer: 'Nome do closer (opcional)',
        qr_code: 'Código QR (opcional)',
        category: 'Categoria (opcional)',
        faturamento: 'Faturamento mensal (opcional)',
        oportunidade: 'Se é oportunidade - "Acompanhante" = não é oportunidade',
        funnel_origin: 'Funil de origem (opcional)',
        form_data: {
          'Digite seu CPF': 'CPF do participante',
          'Qual o telefone?': 'Telefone/WhatsApp',
          'Nome para crachá': 'Nome para crachá',
          'Qual a sua área de atuação?': 'Nicho/área',
          'Qual o seu faturamento mensal?': 'Faturamento',
          'Adicione uma foto sua para perfil.': 'URL da foto',
          'Qual a maior dificuldade no seu negócio?': 'Resposta dificuldade',
          'O que você pretende aprender no Intensivo?': 'Resposta objetivo',
        },
      },
      checkin_days: {
        day_1: '"checked_in" = presente, "pending" ou outro = ausente',
        day_2: '"checked_in" = presente, "pending" ou outro = ausente',
        day_3: '"checked_in" = presente, "pending" ou outro = ausente',
      },
    },
    exemplo: {
      event: {
        id: 'ce225b43-21e4-4536-9919-04017296f085',
        name: 'Intensivo Da Alta Performance',
      },
      timestamp: '2026-02-17T17:37:13.329Z',
      event_type: 'registration_updated',
      participant: {
        id: 'b04ec1f6-54d5-4d59-bb22-9818d4231b5d',
        name: 'João Silva',
        email: 'joao@email.com',
        setor: 'Standard',
        oportunidade: 'Sim',
        funnel_origin: 'Indicação',
        form_data: {
          'Digite seu CPF': '123.456.789-00',
          'Qual o telefone?': '(11) 99999-9999',
          'Nome para crachá': 'João',
          'Qual a sua área de atuação?': 'Marketing Digital',
          'Qual o seu faturamento mensal?': 'R$ 20.000,00 até R$ 50.000,00',
        },
      },
      checkin_days: {
        day_1: 'checked_in',
        day_2: 'pending',
        day_3: 'pending',
      },
    },
  })
}
