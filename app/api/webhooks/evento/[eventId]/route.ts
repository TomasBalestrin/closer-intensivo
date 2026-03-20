import { NextResponse } from 'next/server'
import {
  getWebhookSupabase,
  processParticipantWebhook,
  WebhookValidationError,
} from '@/lib/webhooks/process-participant'

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const supabase = getWebhookSupabase()

  try {
    const { eventId } = params

    // Validate event exists
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, nome_evento')
      .eq('id', eventId)
      .single()

    if (eventError || !eventData) {
      return NextResponse.json(
        { error: 'Evento não encontrado', event_id: eventId },
        { status: 404 }
      )
    }

    const payload = await request.json()

    // Log the webhook
    const { data: logData } = await supabase
      .from('webhooks_log')
      .insert({ payload, processed: false })
      .select('id')
      .single()
    const logId = logData?.id

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

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  const supabase = getWebhookSupabase()

  const { data: eventData } = await supabase
    .from('events')
    .select('id, nome_evento')
    .eq('id', params.eventId)
    .single()

  if (!eventData) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    status: 'ok',
    evento: eventData.nome_evento,
    event_id: eventData.id,
    description: 'Webhook para importação de participantes deste evento',
    method: 'POST',
    nota: 'Não é necessário enviar event.id no payload. O evento é identificado automaticamente pela URL.',
    exemplo: {
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
