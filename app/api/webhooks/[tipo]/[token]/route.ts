import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateSignature } from '@/lib/webhooks/signature'
import { getColorFromRevenue, getQualificationFromRevenue } from '@/lib/utils'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Clean instagram handle
function cleanInstagram(value: string | undefined): string | null {
  if (!value) return null
  return value.replace(/^@/, '').trim() || null
}

// Handler: Participantes
async function processarParticipante(body: any, supabase: any) {
  // Support new format: participant.form_data contains questions/answers
  const participant = body.participant || {}
  const formData = participant.form_data || {}
  const fields = body.fields || body
  const event = body.event || {}

  // Extract from form_data (questions as keys) or legacy fields
  const name = participant.name || formData['Qual o seu nome?'] || formData['nome_completo'] || fields?.nome_completo || fields?.nome || body?.nome || body?.name
  const email = participant.email || formData['Qual o seu e-mail?'] || formData['Digite seu e-mail'] || fields?.digite_seu_melhor_email || fields?.email || body?.email
  const phone = formData['Qual o seu número de telefone?'] || formData['Telefone'] || formData['WhatsApp'] || fields?.digite_seu_whatsapp || fields?.telefone || body?.telefone
  const instagram = cleanInstagram(formData['Qual seu @ do Instagram?'] || formData['Instagram'] || fields?.qual_seu_do_instagram || fields?.instagram)
  const cpf = formData['Digite seu CPF'] || formData['CPF'] || fields?.digite_o_seu_cpf_ou_cnpj || fields?.cpf || body?.cpf
  const badge_name = formData['Nome para crachá?'] || formData['Nome no crachá'] || fields?.nome_para_cracha || fields?.badge_name
  const niche = formData['Qual sua área de atuação?'] || formData['Qual sua área de atuação profissional'] || fields?.qual_sua_area_de_atuacao_profissional || fields?.niche || body?.niche
  const revenue = formData['Qual o seu faturamento mensal?'] || formData['Quanto você fatura por mês?'] || participant.faturamento || fields?.quanto_voce_fatura_por_mes || fields?.revenue || body?.faturamento
  const net_profit = formData['Qual seu lucro líquido mensal?'] || fields?.qual_seu_lucro_liquido_mensal || fields?.net_profit
  const photo_url = formData['Adicione uma foto sua para perfil.'] || formData['Foto de perfil'] || fields?.qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos || fields?.photo_url
  const partner = formData['Você tem sócio?'] || fields?.voce_tem_socio || fields?.partner
  const companion = formData['Seu acompanhante é?'] || formData['Acompanhante'] || fields?.companion
  const external_id = participant.id || body?.participant_id || body?.external_id

  // Extract seller/vendedor info (could come as name or ID)
  const sellerName = formData['Vendedor'] || formData['vendedor'] || formData['Closer'] || formData['closer'] ||
                     fields?.vendedor || fields?.seller || fields?.closer ||
                     participant.vendedor || participant.seller || participant.closer ||
                     body?.vendedor || body?.seller || body?.closer
  const qr_code = participant.qr_code
  const category = participant.category
  const status = participant.status
  const event_id = event.id

  // Extract is_opportunity from webhook payload
  const rawOpportunity = participant.oportunidade ?? fields?.is_opportunity ?? fields?.oportunidade ?? body?.is_opportunity ?? body?.oportunidade
  const is_opportunity = rawOpportunity === true || rawOpportunity === 'true' || rawOpportunity === 'sim' || rawOpportunity === 'Sim' || rawOpportunity === 'yes' || rawOpportunity === '1'

  if (!name) {
    return { status: 400, error: 'Nome é obrigatório' }
  }

  // Check for existing participant (CPF first - most reliable)
  let existingParticipant = null
  if (cpf) {
    const { data } = await supabase.from('participants').select('id').eq('cpf', cpf).single()
    existingParticipant = data
  }
  if (!existingParticipant && external_id) {
    const { data } = await supabase.from('participants').select('id').eq('external_id', external_id).single()
    existingParticipant = data
  }
  if (!existingParticipant && email) {
    const { data } = await supabase.from('participants').select('id').eq('email', email).single()
    existingParticipant = data
  }
  if (!existingParticipant && qr_code) {
    const { data } = await supabase.from('participants').select('id').eq('qr_code', qr_code).single()
    existingParticipant = data
  }
  if (!existingParticipant && name) {
    const { data } = await supabase.from('participants').select('id').eq('name', name).single()
    existingParticipant = data
  }

  const color = getColorFromRevenue(revenue) || null
  const qualification = getQualificationFromRevenue(revenue) || null

  // Try to find seller/closer by name if provided
  let sellerCloserId: string | null = null
  if (sellerName) {
    const { data: closerUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'closer')
      .ilike('name', `%${sellerName}%`)
      .single()
    if (closerUser) {
      sellerCloserId = closerUser.id
    }
  }

  // Auto-assign closer if seller_closer is available for this event
  let assignedCloserId: string | null = null
  if (sellerCloserId && event_id) {
    const { data: userEventEntry } = await supabase
      .from('user_events')
      .select('user_id')
      .eq('user_id', sellerCloserId)
      .eq('event_id', event_id)
      .eq('role', 'closer')
      .single()

    if (userEventEntry) {
      assignedCloserId = sellerCloserId
    }
  }

  // Extract checkin data from checkin_days format
  const checkinData: Record<string, boolean> = {}
  const checkinDays = body.checkin_days || {}
  if (checkinDays.day_1 !== undefined) {
    checkinData.checked_in_day1 = checkinDays.day_1 === 'checked_in' || checkinDays.day_1 === true
  }
  if (checkinDays.day_2 !== undefined) {
    checkinData.checked_in_day2 = checkinDays.day_2 === 'checked_in' || checkinDays.day_2 === true
  }
  if (checkinDays.day_3 !== undefined) {
    checkinData.checked_in_day3 = checkinDays.day_3 === 'checked_in' || checkinDays.day_3 === true
  }
  // Legacy format support
  if (body.checkin1 !== undefined) {
    checkinData.checked_in_day1 = body.checkin1 !== null && body.checkin1 !== false && body.checkin1 !== '' && body.checkin1 !== 0
  }
  if (body.checkin2 !== undefined) {
    checkinData.checked_in_day2 = body.checkin2 !== null && body.checkin2 !== false && body.checkin2 !== '' && body.checkin2 !== 0
  }
  if (body.checkin3 !== undefined) {
    checkinData.checked_in_day3 = body.checkin3 !== null && body.checkin3 !== false && body.checkin3 !== '' && body.checkin3 !== 0
  }

  const participantData: Record<string, any> = {
    name,
    email: email || null,
    phone: phone || null,
    photo_url: photo_url || null,
    revenue: revenue || null,
    niche: niche || null,
    instagram,
    external_id: external_id || null,
    cpf: cpf || null,
    badge_name: badge_name || null,
    partner: partner || null,
    companion: companion || null,
    net_profit: net_profit || null,
    color,
    qualification,
    is_opportunity: rawOpportunity !== undefined ? is_opportunity : undefined,
    // Save full payload for debugging
    webhook_data: body,
    ...checkinData,
  }

  // Add optional fields if present
  if (qr_code) participantData.qr_code = qr_code
  if (category) participantData.category = category
  if (status) participantData.registration_status = status
  if (event_id) participantData.event_id = event_id
  if (sellerCloserId) participantData.seller_closer_id = sellerCloserId
  if (sellerName) participantData.seller_closer_name = sellerName

  if (existingParticipant) {
    // Check if participant already has an assigned_closer_id (don't overwrite manual assignments)
    const { data: currentParticipant } = await supabase
      .from('participants')
      .select('assigned_closer_id')
      .eq('id', existingParticipant.id)
      .single()

    // Only auto-assign if currently unassigned
    if (!currentParticipant?.assigned_closer_id && assignedCloserId) {
      participantData.assigned_closer_id = assignedCloserId
    }
  } else {
    // For new participants, auto-assign if closer is available for the event
    if (assignedCloserId) participantData.assigned_closer_id = assignedCloserId
  }

  if (existingParticipant) {
    // Form-derived fields: replace completely (include nulls to clear old values)
    // Structural fields: merge only (skip nulls to preserve existing data)
    const FORM_DERIVED_FIELDS = new Set([
      'cpf', 'phone', 'badge_name', 'niche', 'revenue',
      'photo_url', 'challenge_answer', 'desired_change_answer', 'instagram',
      'partner', 'net_profit', 'tem_acompanhante', 'relacao_acompanhante',
      'companion', 'form_data', 'color', 'qualification',
    ])

    const updateData: Record<string, any> = {}
    for (const [key, value] of Object.entries(participantData)) {
      if (value === undefined) continue
      // On update: only skip nulls for structural fields (not form-derived)
      if (value === null && !FORM_DERIVED_FIELDS.has(key)) continue
      updateData[key] = value
    }

    const { error } = await supabase
      .from('participants')
      .update(updateData)
      .eq('id', existingParticipant.id)
    if (error) throw error
    return {
      status: 200,
      message: 'Participante atualizado',
      data: { id: existingParticipant.id, nome: name },
      entidade_tipo: 'participante',
      entidade_id: existingParticipant.id,
    }
  } else {
    const { data: newP, error } = await supabase
      .from('participants')
      .insert(participantData)
      .select('id')
      .single()
    if (error) throw error
    return {
      status: 201,
      message: 'Participante criado',
      data: { id: newP.id, nome: name },
      entidade_tipo: 'participante',
      entidade_id: newP.id,
    }
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
    // Try as internal UUID first
    const { data } = await supabase.from('participants').select('id').eq('id', participante_id).single()
    participant = data
    // Then try as external_id
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
    const { data } = await supabase.from('participants').select('id').eq('name', name).single()
    participant = data
  }

  if (!participant) {
    return { status: 404, error: 'Participante não encontrado', identifiers: { email, cpf, name, participante_id } }
  }

  // Check if payload has checkin1/2/3 format (timestamps or booleans per day)
  const hasMultiDayFormat = body.checkin1 !== undefined || body.checkin2 !== undefined || body.checkin3 !== undefined

  const updateData: Record<string, any> = {}

  if (hasMultiDayFormat) {
    // Format: { checkin1: "2026-01-30T...", checkin2: "2026-01-31T...", checkin3: null }
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
    // Legacy format: { day: 1, status_credenciamento: 'checked_in' }
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

  // Find participant
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
      // Log error
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

    // Log error
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
