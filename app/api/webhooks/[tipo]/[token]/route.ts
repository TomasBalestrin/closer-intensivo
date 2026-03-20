import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateSignature } from '@/lib/webhooks/signature'
import {
  processParticipantWebhook,
  WebhookValidationError,
} from '@/lib/webhooks/process-participant'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Handler: Participantes — uses shared processing module
async function processarParticipante(body: any, supabase: any) {
  const event = body.event || {}
  const event_id = event.id || undefined

  try {
    const result = await processParticipantWebhook(supabase, body, {
      eventId: event_id,
      structuredFormat: !!(body.participant || body.fields),
      autoAssignCloser: true,
    })

    return {
      status: result.action === 'created' ? 201 : 200,
      message: result.action === 'created' ? 'Participante criado' : 'Participante atualizado',
      data: { id: result.participantId, nome: result.name },
      entidade_tipo: 'participante',
      entidade_id: result.participantId,
    }
  } catch (error: any) {
    if (error instanceof WebhookValidationError) {
      return { status: 400, error: error.message }
    }
    throw error
  }
}

// Handler: Credenciamentos
async function processarCredenciamento(body: any, supabase: any) {
  const fields = body.fields || body
  const email = body.email || body.login_value || fields?.email || fields?.digite_seu_melhor_email
  const cpf = body.cpf || fields?.cpf || fields?.digite_o_seu_cpf_ou_cnpj
  const name = body.name || body.nome || fields?.nome_completo || fields?.nome
  const participante_id = body.participante_id || body.participant_id || body.external_id
  const status_credenciamento = body.status_credenciamento || body.status || 'checked_in'

  // Find participant by priority: id > external_id > email > cpf > name
  let participant = null
  if (participante_id) {
    const { data } = await supabase.from('participants').select('id').eq('id', participante_id).single()
    participant = data
    if (!participant) {
      const { data: extData } = await supabase.from('participants').select('id').eq('external_id', participante_id).single()
      participant = extData
    }
  }
  if (!participant && email) {
    const { data } = await supabase.from('participants').select('id').eq('email', email).single()
    participant = data
  }
  if (!participant && cpf) {
    const { data } = await supabase.from('participants').select('id').eq('cpf', cpf).single()
    participant = data
  }
  if (!participant && name) {
    const { data } = await supabase.from('participants').select('id').ilike('name', name.trim()).single()
    participant = data
  }

  if (!participant) {
    return { status: 404, error: 'Participante não encontrado', identifiers: { email, cpf, name, participante_id } }
  }

  const hasMultiDayFormat = body.checkin1 !== undefined || body.checkin2 !== undefined || body.checkin3 !== undefined

  const updateData: Record<string, any> = {}

  if (hasMultiDayFormat) {
    if (body.checkin1 !== undefined) {
      updateData.checked_in_day1 = body.checkin1 !== null && body.checkin1 !== false && body.checkin1 !== '' && body.checkin1 !== 0
    }
    if (body.checkin2 !== undefined) {
      updateData.checked_in_day2 = body.checkin2 !== null && body.checkin2 !== false && body.checkin2 !== '' && body.checkin2 !== 0
    }
    if (body.checkin3 !== undefined) {
      updateData.checked_in_day3 = body.checkin3 !== null && body.checkin3 !== false && body.checkin3 !== '' && body.checkin3 !== 0
    }
  } else {
    const dia = parseInt(body.dia || body.day || body.fields?.dia || body.fields?.day || '1')

    if (status_credenciamento === 'checked_in') {
      if (dia === 1) updateData.checked_in_day1 = true
      else if (dia === 2) updateData.checked_in_day2 = true
      else if (dia === 3) updateData.checked_in_day3 = true
    } else if (status_credenciamento === 'cancelado') {
      if (dia === 1) updateData.checked_in_day1 = false
      else if (dia === 2) updateData.checked_in_day2 = false
      else if (dia === 3) updateData.checked_in_day3 = false
    }
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('participants')
      .update(updateData)
      .eq('id', participant.id)
    if (error) throw error
  }

  return {
    status: 200,
    message: `Credenciamento ${status_credenciamento}`,
    data: { participante_id: participant.id, status: status_credenciamento, days: updateData },
    entidade_tipo: 'participante',
    entidade_id: participant.id,
  }
}

// Handler: Vendas
async function processarVenda(body: any, supabase: any) {
  const email = body.participante_email || body.email
  const produto = body.produto || body.product
  const valor_total = body.valor_total || body.total_value
  const valor_entrada = body.valor_entrada || body.entry_value || 0

  if (!email || !produto || valor_total === undefined) {
    return { status: 400, error: 'participante_email, produto e valor_total são obrigatórios' }
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('id, closer_id')
    .eq('email', email)
    .single()

  if (!participant) {
    return { status: 404, error: 'Participante não encontrado pelo email informado' }
  }

  const { data: sale, error } = await supabase
    .from('sales')
    .insert({
      participant_id: participant.id,
      closer_id: participant.closer_id || '00000000-0000-0000-0000-000000000000',
      product_name: produto,
      amount: parseFloat(valor_total),
      total_value: parseFloat(valor_total),
      entry_value: parseFloat(valor_entrada),
      negotiation_type: body.negotiation_type || body.metodo_pagamento || 'webhook',
    })
    .select('id')
    .single()

  if (error) throw error

  return {
    status: 201,
    message: 'Venda registrada',
    data: { id: sale.id, participante_id: participant.id },
    entidade_tipo: 'venda',
    entidade_id: sale.id,
  }
}

type HandlerResult = {
  status: number
  error?: string
  message?: string
  data?: Record<string, any>
  entidade_tipo?: string
  entidade_id?: string
}

type WebhookHandler = (body: any, supabase: any) => Promise<HandlerResult>

const handlers: Record<string, WebhookHandler> = {
  participantes: processarParticipante,
  credenciamentos: processarCredenciamento,
  vendas: processarVenda,
}

export async function POST(
  request: Request,
  { params }: { params: { tipo: string; token: string } }
) {
  const supabase = getSupabase()
  const inicio = Date.now()
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  try {
    // Validate webhook by token
    const { data: webhook } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tipo', 'inbound')
      .eq('categoria', params.tipo)
      .eq('token', params.token)
      .eq('ativo', true)
      .single()

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook não encontrado ou inativo', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate signature if configured
    if (webhook.secret_key) {
      const signature = request.headers.get('x-webhook-signature')
      if (!validateSignature(body, webhook.secret_key, signature)) {
        return NextResponse.json(
          { success: false, error: 'Assinatura inválida', code: 'INVALID_SIGNATURE' },
          { status: 401 }
        )
      }
    }

    const handler = handlers[params.tipo]
    if (!handler) {
      return NextResponse.json(
        { success: false, error: 'Tipo de webhook não suportado', code: 'INVALID_TYPE' },
        { status: 400 }
      )
    }

    const resultado = await handler(body, supabase)
    const duracao = Date.now() - inicio

    if (resultado.error) {
      await supabase.from('webhook_logs').insert({
        webhook_id: webhook.id,
        direcao: 'inbound',
        evento: `${params.tipo}.error`,
        request_body: body,
        duracao_ms: duracao,
        status: 'error',
        erro_mensagem: resultado.error,
        ip_origem: ip,
      })

      return NextResponse.json(
        { success: false, error: resultado.error },
        { status: resultado.status }
      )
    }

    // Log success
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      direcao: 'inbound',
      evento: `${params.tipo}.received`,
      request_body: body,
      response_status: resultado.status,
      duracao_ms: duracao,
      status: 'success',
      entidade_tipo: resultado.entidade_tipo,
      entidade_id: resultado.entidade_id,
      ip_origem: ip,
    })

    // Update stats
    await supabase.rpc('incrementar_webhook_sucesso', { p_webhook_id: webhook.id })

    return NextResponse.json(
      { success: true, message: resultado.message, data: resultado.data },
      { status: resultado.status }
    )
  } catch (error: any) {
    const duracao = Date.now() - inicio

    try {
      await supabase.from('webhook_logs').insert({
        direcao: 'inbound',
        evento: `${params.tipo}.error`,
        duracao_ms: duracao,
        status: 'error',
        erro_mensagem: error.message,
        ip_origem: ip,
      })
    } catch {}

    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
