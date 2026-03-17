import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getColorFromRevenue, getQualificationFromRevenue } from '@/lib/utils'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

function normalizeKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

const FORM_DATA_MAPPINGS: Record<string, string[]> = {
  cpf: ['digite_seu_cpf', 'cpf', 'cnpj', 'cpf_cnpj', 'documento', 'digite_o_seu_cpf_ou_cnpj'],
  phone: ['qual_o_telefone', 'telefone', 'whatsapp', 'celular', 'qual_o_seu_numero_de_telefone', 'digite_seu_whatsapp'],
  badge_name: ['nome_para_cracha', 'cracha', 'apelido'],
  niche: ['qual_a_sua_area_de_atuacao', 'qual_sua_area_de_atuacao', 'area_de_atuacao', 'nicho', 'area_atuacao', 'segmento', 'profissao'],
  revenue: ['qual_o_seu_faturamento_mensal', 'faturamento', 'faturamento_mensal', 'quanto_fatura', 'quanto_voce_fatura_por_mes'],
  photo_url: ['adicione_uma_foto_sua_para_perfil', 'foto', 'foto_perfil', 'photo', 'qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos'],
  challenge_answer: ['qual_a_maior_dificuldade_no_seu_negocio', 'maior_dificuldade', 'dificuldade', 'desafio', 'qual_sua_maior_dificuldade_no_seu_negocio_hoje'],
  desired_change_answer: ['o_que_voce_pretende_aprender_no_intensivo', 'o_que_busca', 'objetivo', 'expectativa', 'o_que_pretende_aprender_no_intensivo_da_alta_performance'],
  instagram: ['instagram', 'insta', 'qual_seu_instagram', 'qual_seu_do_instagram', 'qual_o_do_seu_instagram'],
  partner: ['voce_tem_socio', 'socio', 'tem_socio'],
  net_profit: ['lucro_liquido', 'qual_seu_lucro_liquido_mensal', 'lucro'],
}

function extractFromFormData(formData: Record<string, any>, targetField: string): any {
  const aliases = FORM_DATA_MAPPINGS[targetField] || []

  for (const [key, value] of Object.entries(formData)) {
    const normKey = normalizeKey(key)

    if (aliases.includes(normKey)) {
      return value
    }

    for (const alias of aliases) {
      if (normKey.includes(alias) || alias.includes(normKey)) {
        return value
      }
    }
  }

  return null
}

function parseCheckinStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return status.toLowerCase() === 'checked_in'
}

function cleanInstagram(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') return null
  return value.replace(/^@/, '').trim() || null
}

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const supabase = getSupabase()

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

    // Support both unified format and flat format
    const participant = payload.participant || payload
    const formData = participant.form_data || payload.fields || {}
    const checkinDays = payload.checkin_days || {}

    // Extract participant fields
    const name = participant.name || formData['Digite seu nome completo'] || formData['nome_completo'] || formData['nome'] || payload.nome || payload.name
    const email = participant.email || payload.email || payload.login_value
    const externalId = participant.id || payload.participant_id || payload.external_id

    if (!name && !email) {
      return NextResponse.json(
        { error: 'Participante precisa ter name ou email' },
        { status: 400 }
      )
    }

    // Extract from form_data with flexible matching
    const cpf = extractFromFormData(formData, 'cpf') || participant.cpf || payload.cpf
    const phone = extractFromFormData(formData, 'phone') || participant.phone || payload.phone
    const badgeName = extractFromFormData(formData, 'badge_name')
    // Note: participant.setor is category, not niche - use form_data for actual niche
    const niche = extractFromFormData(formData, 'niche') || payload.niche
    const revenue = participant.faturamento || extractFromFormData(formData, 'revenue') || payload.faturamento
    const photoUrl = extractFromFormData(formData, 'photo_url')
    const challengeAnswer = extractFromFormData(formData, 'challenge_answer')
    const desiredChangeAnswer = extractFromFormData(formData, 'desired_change_answer')
    const instagram = cleanInstagram(extractFromFormData(formData, 'instagram') || participant.instagram)
    const partner = extractFromFormData(formData, 'partner')
    const netProfit = extractFromFormData(formData, 'net_profit')

    // Extract additional fields from participant object
    const closer = participant.closer || payload.closer
    const category = participant.category || participant.setor || payload.category
    const qrCode = participant.qr_code || participant.qrcode || payload.qr_code
    // status removido - conflita com constraint do banco

    // Parse checkin days - only set to true, never overwrite with false
    // If status is "checked_in", set to true; otherwise, leave as undefined (won't overwrite existing value)
    const checkedInDay1 = parseCheckinStatus(checkinDays.day_1) ? true : undefined
    const checkedInDay2 = parseCheckinStatus(checkinDays.day_2) ? true : undefined
    const checkedInDay3 = parseCheckinStatus(checkinDays.day_3) ? true : undefined

    // Calculate color and qualification from revenue
    const color = getColorFromRevenue(revenue) || null
    const qualification = getQualificationFromRevenue(revenue) || null

    // Determine if opportunity
    const oportunidadeValue = (participant.oportunidade || payload.oportunidade || '').toString().toLowerCase()
    const isOpportunity = oportunidadeValue !== 'acompanhante' &&
                          oportunidadeValue !== 'nao' &&
                          oportunidadeValue !== 'não' &&
                          oportunidadeValue !== 'false' &&
                          oportunidadeValue !== ''

    // Build scoped query for deduplication within event
    const scopedQuery = () => supabase.from('participants').select('id').eq('event_id', eventId)

    // Check if participant exists (within this event)
    let existingParticipant = null

    if (externalId) {
      const { data } = await scopedQuery().eq('external_id', externalId).single()
      existingParticipant = data
    }
    if (!existingParticipant && email) {
      const { data } = await scopedQuery().eq('email', email).single()
      existingParticipant = data
    }
    if (!existingParticipant && cpf) {
      const { data } = await scopedQuery().eq('cpf', cpf).single()
      existingParticipant = data
    }
    if (!existingParticipant && name) {
      const { data } = await scopedQuery().eq('name', name).single()
      existingParticipant = data
    }

    // Build participant data
    const participantData: Record<string, any> = {
      event_id: eventId,
      name,
      email,
      external_id: externalId,
      cpf,
      phone,
      badge_name: badgeName,
      niche,
      revenue,
      photo_url: photoUrl,
      challenge_answer: challengeAnswer,
      desired_change_answer: desiredChangeAnswer,
      instagram,
      partner,
      net_profit: netProfit,
      color,
      qualification,
      funnel: participant.funnel_origin || payload.funnel_origin || null,
      closer,
      category,
      qr_code: qrCode,
      // status removido - conflita com constraint do banco
      is_opportunity: isOpportunity,
      checked_in_day1: checkedInDay1,
      checked_in_day2: checkedInDay2,
      checked_in_day3: checkedInDay3,
      webhook_data: payload,
    }

    // Remove null/undefined values for updates
    const cleanData = (data: Record<string, any>, isUpdate: boolean) => {
      const result: Record<string, any> = {}
      for (const [key, value] of Object.entries(data)) {
        if (isUpdate && value === null) continue
        if (value === undefined) continue
        result[key] = value
      }
      return result
    }

    if (existingParticipant) {
      const updateData = cleanData(participantData, true)

      const { error: updateError } = await supabase
        .from('participants')
        .update(updateData)
        .eq('id', existingParticipant.id)

      if (updateError) {
        console.error('Error updating participant:', updateError)
        return NextResponse.json(
          { error: 'Erro ao atualizar participante', details: updateError.message },
          { status: 500 }
        )
      }

      if (logId) {
        await supabase.from('webhooks_log').update({ processed: true }).eq('id', logId)
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        participantId: existingParticipant.id,
        name,
        event_id: eventId,
      })
    } else {
      const insertData = cleanData(participantData, false)
      insertData.name = name

      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert(insertData)
        .select('id')
        .single()

      if (insertError || !newParticipant) {
        console.error('Error creating participant:', insertError)
        return NextResponse.json(
          { error: 'Erro ao criar participante', details: insertError?.message },
          { status: 500 }
        )
      }

      if (logId) {
        await supabase.from('webhooks_log').update({ processed: true }).eq('id', logId)
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        participantId: newParticipant.id,
        name,
        event_id: eventId,
      })
    }
  } catch (error: any) {
    console.error('Webhook error:', error)
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
  const supabase = getSupabase()

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
