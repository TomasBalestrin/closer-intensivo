import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  try {
    // Extract event_id from query parameters
    const reqUrl = new URL(request.url)
    const eventId = reqUrl.searchParams.get('event_id')

    const payload = await request.json()

    // Log the webhook
    const { data: logData } = await supabase
      .from('webhooks_log')
      .insert({ payload, processed: false })
      .select('id')
      .single()
    const logId = logData?.id

    // Accept flexible field names for participant identification
    const email = payload.login_value || payload.email || payload.fields?.digite_seu_melhor_email || payload.fields?.email
    const cpf = payload.cpf || payload.fields?.digite_o_seu_cpf_ou_cnpj || payload.fields?.cpf
    const name = payload.name || payload.nome || payload.fields?.nome_completo || payload.fields?.nome
    const externalId = payload.participant_id || payload.external_id

    // Check if payload has checkin1/2/3 format (timestamps or booleans per day)
    const hasMultiDayFormat = payload.checkin1 !== undefined || payload.checkin2 !== undefined || payload.checkin3 !== undefined

    if (!email && !cpf && !name && !externalId) {
      return NextResponse.json(
        { error: 'Identificação do participante obrigatória (email, cpf, name ou participant_id)' },
        { status: 400 }
      )
    }

    // Helper to build scoped queries by event
    const scopedQuery = () => {
      let query = supabase.from('participants').select('id, name')
      if (eventId) query = query.eq('event_id', eventId)
      return query
    }

    // Find participant by priority: external_id > email > cpf > name
    let participant = null

    if (externalId) {
      const { data } = await scopedQuery().eq('external_id', externalId).single()
      participant = data
    }

    if (!participant && email) {
      const { data } = await scopedQuery().eq('email', email).single()
      participant = data
    }

    if (!participant && cpf) {
      const { data } = await scopedQuery().eq('cpf', cpf).single()
      participant = data
    }

    if (!participant && name) {
      const { data } = await scopedQuery().eq('name', name).single()
      participant = data
    }

    if (!participant) {
      return NextResponse.json(
        { error: 'Participante não encontrado', identifiers: { email, cpf, name, externalId } },
        { status: 404 }
      )
    }

    // Build update data based on payload format
    const updateData: Record<string, boolean> = {}

    if (hasMultiDayFormat) {
      // Format: { checkin1: "2026-01-30T...", checkin2: "2026-01-31T...", checkin3: null }
      // A non-null value means checked in
      if (payload.checkin1 !== undefined) {
        updateData.checked_in_day1 = payload.checkin1 !== null && payload.checkin1 !== false && payload.checkin1 !== '' && payload.checkin1 !== 0
      }
      if (payload.checkin2 !== undefined) {
        updateData.checked_in_day2 = payload.checkin2 !== null && payload.checkin2 !== false && payload.checkin2 !== '' && payload.checkin2 !== 0
      }
      if (payload.checkin3 !== undefined) {
        updateData.checked_in_day3 = payload.checkin3 !== null && payload.checkin3 !== false && payload.checkin3 !== '' && payload.checkin3 !== 0
      }
    } else {
      // Legacy format: { day: 1 } or { dia: 2 }
      const day = parseInt(payload.day || payload.dia || payload.fields?.dia || payload.fields?.day || '1')
      if (![1, 2, 3].includes(day)) {
        return NextResponse.json(
          { error: 'Dia inválido. Use day: 1, 2 ou 3' },
          { status: 400 }
        )
      }
      updateData[`checked_in_day${day}`] = true
    }

    const { error: updateError } = await supabase
      .from('participants')
      .update(updateData)
      .eq('id', participant.id)

    if (updateError) {
      console.error('Error updating check-in:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar credenciamento', details: updateError.message },
        { status: 500 }
      )
    }

    // Mark webhook as processed
    if (logId) {
      await supabase
        .from('webhooks_log')
        .update({ processed: true })
        .eq('id', logId)
    }

    return NextResponse.json({
      success: true,
      action: 'checkin',
      participantId: participant.id,
      participantName: participant.name,
      days: updateData,
    })
  } catch (error: any) {
    console.error('Checkin webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET for testing / documentation
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook de credenciamento ativo. Envie requisições POST.',
    expectedPayload: {
      email: 'string (identificação do participante)',
      cpf: 'string (alternativa)',
      name: 'string (alternativa)',
      participant_id: 'string (ID externo, alternativa)',
      day: 'number (1, 2 ou 3 - dia do evento)',
    },
    alternativeFormat: {
      fields: {
        email: 'string',
        nome_completo: 'string',
        dia: 'number',
      },
    },
  })
}
