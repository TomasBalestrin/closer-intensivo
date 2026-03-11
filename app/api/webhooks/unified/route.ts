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

// Remove accents for matching
function normalizeKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// Field mappings for form_data - maps normalized keys to DB columns
const FORM_DATA_MAPPINGS: Record<string, string[]> = {
  cpf: ['digite_seu_cpf', 'cpf', 'cnpj', 'cpf_cnpj', 'documento'],
  phone: ['qual_o_telefone', 'telefone', 'whatsapp', 'celular', 'qual_o_seu_numero_de_telefone'],
  badge_name: ['nome_para_cracha', 'cracha', 'apelido'],
  niche: ['qual_a_sua_area_de_atuacao', 'nicho', 'area_atuacao', 'segmento', 'profissao'],
  revenue: ['qual_o_seu_faturamento_mensal', 'faturamento', 'faturamento_mensal', 'quanto_fatura'],
  photo_url: ['adicione_uma_foto_sua_para_perfil', 'foto', 'foto_perfil', 'photo'],
  challenge_answer: ['qual_a_maior_dificuldade_no_seu_negocio', 'maior_dificuldade', 'dificuldade', 'desafio'],
  desired_change_answer: ['o_que_voce_pretende_aprender_no_intensivo', 'o_que_busca', 'objetivo', 'expectativa'],
  instagram: ['instagram', 'insta', 'qual_seu_instagram'],
  partner: ['voce_tem_socio', 'socio', 'tem_socio'],
  net_profit: ['lucro_liquido', 'qual_seu_lucro_liquido_mensal', 'lucro'],
}

// Extract value from form_data using flexible key matching
function extractFromFormData(formData: Record<string, any>, targetField: string): any {
  const aliases = FORM_DATA_MAPPINGS[targetField] || []

  for (const [key, value] of Object.entries(formData)) {
    const normKey = normalizeKey(key)

    // Check exact match first
    if (aliases.includes(normKey)) {
      return value
    }

    // Check if any alias is contained in the key
    for (const alias of aliases) {
      if (normKey.includes(alias) || alias.includes(normKey)) {
        return value
      }
    }
  }

  return null
}

// Parse checkin status - "checked_in" = true, anything else = false
function parseCheckinStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return status.toLowerCase() === 'checked_in'
}

// Clean instagram handle
function cleanInstagram(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') return null
  return value.replace(/^@/, '').trim() || null
}

export async function POST(request: Request) {
  const supabase = getSupabase()

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
    const participant = payload.participant
    const formData = participant.form_data || {}
    const checkinDays = payload.checkin_days || {}

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

    // Extract participant fields
    const name = participant.name || formData['Digite seu nome completo'] || formData['nome_completo'] || formData['nome']
    const email = participant.email
    const externalId = participant.id // Use participant.id as external_id

    // Extract from form_data with flexible matching
    const cpf = extractFromFormData(formData, 'cpf')
    const phone = extractFromFormData(formData, 'phone')
    const badgeName = extractFromFormData(formData, 'badge_name')
    // Note: participant.setor is category, not niche
    const niche = extractFromFormData(formData, 'niche')
    const revenue = participant.faturamento || extractFromFormData(formData, 'revenue')
    const photoUrl = extractFromFormData(formData, 'photo_url')
    const challengeAnswer = extractFromFormData(formData, 'challenge_answer')
    const desiredChangeAnswer = extractFromFormData(formData, 'desired_change_answer')
    const instagram = cleanInstagram(extractFromFormData(formData, 'instagram'))
    const partner = extractFromFormData(formData, 'partner')
    const netProfit = extractFromFormData(formData, 'net_profit')

    // Extract additional fields from participant object
    const closer = participant.closer
    const category = participant.category || participant.setor
    const qrCode = participant.qr_code || participant.qrcode
    const status = participant.status

    // Parse checkin days
    const checkedInDay1 = parseCheckinStatus(checkinDays.day_1)
    const checkedInDay2 = parseCheckinStatus(checkinDays.day_2)
    const checkedInDay3 = parseCheckinStatus(checkinDays.day_3)

    // Calculate color and qualification from revenue
    const color = getColorFromRevenue(revenue) || null
    const qualification = getQualificationFromRevenue(revenue) || null

    // Determine if opportunity based on oportunidade field
    // "Acompanhante" = not opportunity, otherwise check value
    const oportunidadeValue = participant.oportunidade?.toLowerCase() || ''
    const isOpportunity = oportunidadeValue !== 'acompanhante' &&
                          oportunidadeValue !== 'nao' &&
                          oportunidadeValue !== 'não' &&
                          oportunidadeValue !== 'false' &&
                          oportunidadeValue !== ''

    // Build scoped query for deduplication within event
    const scopedQuery = () => supabase.from('participants').select('id').eq('event_id', eventId)

    // Check if participant exists (within this event)
    let existingParticipant = null

    // 1. By external_id
    if (externalId) {
      const { data } = await scopedQuery().eq('external_id', externalId).single()
      existingParticipant = data
    }

    // 2. By email
    if (!existingParticipant && email) {
      const { data } = await scopedQuery().eq('email', email).single()
      existingParticipant = data
    }

    // 3. By CPF
    if (!existingParticipant && cpf) {
      const { data } = await scopedQuery().eq('cpf', cpf).single()
      existingParticipant = data
    }

    // 4. By name (last resort)
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
      funnel: participant.funnel_origin || null,
      closer,
      category,
      qr_code: qrCode,
      status,
      is_opportunity: isOpportunity,
      checked_in_day1: checkedInDay1,
      checked_in_day2: checkedInDay2,
      checked_in_day3: checkedInDay3,
      webhook_data: payload,
    }

    // Remove null values for updates (don't overwrite existing data with null)
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
      // Update existing participant
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
        checkin: { day1: checkedInDay1, day2: checkedInDay2, day3: checkedInDay3 },
      })
    } else {
      // Create new participant
      const insertData = cleanData(participantData, false)
      insertData.name = name // Ensure name is always present

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
        checkin: { day1: checkedInDay1, day2: checkedInDay2, day3: checkedInDay3 },
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
        closer: 'Nome do closer (opcional, não utilizado atualmente)',
        status: 'Status do registro (opcional)',
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
