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
  niche: ['qual_a_sua_area_de_atuacao', 'qual_sua_area_de_atuacao', 'area_de_atuacao', 'nicho', 'area_atuacao', 'segmento', 'profissao'],
  revenue: ['qual_o_seu_faturamento_mensal', 'faturamento', 'faturamento_mensal', 'quanto_fatura'],
  photo_url: ['adicione_uma_foto_sua_para_perfil', 'foto', 'foto_perfil', 'photo'],
  challenge_answer: ['qual_a_maior_dificuldade_no_seu_negocio', 'maior_dificuldade', 'dificuldade', 'desafio'],
  desired_change_answer: ['o_que_voce_pretende_aprender_no_intensivo', 'o_que_busca', 'objetivo', 'expectativa'],
  instagram: ['instagram', 'insta', 'qual_seu_instagram', 'qual_seu_do_instagram', 'qual_o_do_seu_instagram', 'seu_instagram', 'qual_e_o_seu_instagram', 'informe_seu_instagram', 'digite_seu_instagram', 'instagram_pessoal'],
  seller_closer_name: ['closer', 'vendedor', 'consultor', 'atendente', 'responsavel', 'closer_indicado', 'indicado', 'indicacao', 'quem_indicou', 'indicado_por', 'convidado_por', 'indicador', 'seller', 'representante'],
  partner: ['voce_tem_socio', 'socio', 'tem_socio'],
  net_profit: ['lucro_liquido', 'qual_seu_lucro_liquido_mensal', 'lucro'],
  tem_acompanhante: ['voce_vai_com_acompanhante', 'tem_acompanhante', 'vai_com_acompanhante', 'acompanhante'],
  relacao_acompanhante: ['seu_acompanhante_e', 'relacao_acompanhante', 'tipo_acompanhante', 'quem_e_acompanhante'],
  companion: ['qual_o_nome_e_sobrenome_do_seu_acompanhante', 'nome_acompanhante', 'nome_do_acompanhante', 'acompanhante_nome'],
  is_opportunity: ['is_opportunity', 'oportunidade', 'opportunity', 'e_oportunidade', 'eh_oportunidade'],
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
  const normalized = status.toLowerCase().replace(/[_\s-]/g, '')
  return normalized === 'checkedin' || normalized === 'checkin'
}

// Look up funil_origem by name/slug and return its UUID
async function lookupFunilOrigemId(
  supabase: any,
  funnelName: string | null,
  eventId: string | null
): Promise<string | null> {
  if (!funnelName || typeof funnelName !== 'string' || !eventId) return null

  const trimmed = funnelName.trim()
  if (!trimmed) return null

  // Try exact match on nome first
  const { data: byName } = await supabase
    .from('funis_origem')
    .select('id')
    .eq('event_id', eventId)
    .eq('ativo', true)
    .ilike('nome', trimmed)
    .single()

  if (byName?.id) return byName.id

  // Try slug match
  const slug = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: bySlug } = await supabase
    .from('funis_origem')
    .select('id')
    .eq('event_id', eventId)
    .eq('ativo', true)
    .eq('slug', slug)
    .single()

  if (bySlug?.id) return bySlug.id

  // Try partial match on nome
  const { data: byPartial } = await supabase
    .from('funis_origem')
    .select('id')
    .eq('event_id', eventId)
    .eq('ativo', true)
    .ilike('nome', `%${trimmed}%`)
    .single()

  return byPartial?.id || null
}

// Clean instagram handle
function cleanInstagram(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') return null
  return value.replace(/^@/, '').trim() || null
}

// Look up closer user by name and return their UUID
async function lookupCloserByName(
  supabase: any,
  sellerName: string | null
): Promise<string | null> {
  if (!sellerName || typeof sellerName !== 'string') return null

  const trimmedName = sellerName.trim()
  if (!trimmedName) return null

  const { data: closerUser } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'closer')
    .ilike('name', `%${trimmedName}%`)
    .single()

  return closerUser?.id || null
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

    // Extract companion fields
    const temAcompanhanteRaw = extractFromFormData(formData, 'tem_acompanhante')
    const temAcompanhante = temAcompanhanteRaw === true ||
                            temAcompanhanteRaw === 'SIM' ||
                            temAcompanhanteRaw === 'sim' ||
                            temAcompanhanteRaw === 'Sim' ||
                            temAcompanhanteRaw === 'true'
    const relacaoAcompanhante = extractFromFormData(formData, 'relacao_acompanhante')
    const companion = extractFromFormData(formData, 'companion')

    // Extract additional fields from participant object
    const sellerCloserName = participant.closer || extractFromFormData(formData, 'seller_closer_name') || null
    const category = participant.category || participant.setor
    const qrCode = participant.qr_code || participant.qrcode
    // status removido - conflita com constraint do banco

    // Look up seller_closer_id from name
    let sellerCloserId: string | null = null
    if (sellerCloserName) {
      sellerCloserId = await lookupCloserByName(supabase, sellerCloserName)
    }

    // Look up funil_origem_id from funnel name
    const funnelName = participant.funnel_origin || null
    const funilOrigemId = await lookupFunilOrigemId(supabase, funnelName, eventId)

    // Parse checkin days - only set to true, never overwrite with false
    // If status is "checked_in", set to true; otherwise, leave as undefined (won't overwrite existing value)
    const checkedInDay1 = parseCheckinStatus(checkinDays.day_1) ? true : undefined
    const checkedInDay2 = parseCheckinStatus(checkinDays.day_2) ? true : undefined
    const checkedInDay3 = parseCheckinStatus(checkinDays.day_3) ? true : undefined

    // Calculate color and qualification from revenue
    const color = getColorFromRevenue(revenue) || null
    const qualification = getQualificationFromRevenue(revenue) || null

    // Determine if opportunity - check participant object, payload root, and form_data
    const oportunidadeValue = participant.oportunidade ??
                              participant.is_opportunity ??
                              payload.oportunidade ??
                              payload.is_opportunity ??
                              extractFromFormData(formData, 'is_opportunity') ??
                              null
    const isTruthyValue = (v: any): boolean => {
      if (v === true) return true
      if (typeof v === 'string') {
        const lower = v.toLowerCase().trim()
        // "Oportunidade" is sent as the value when the participant IS an opportunity
        return ['true', 'sim', 'yes', '1', 's', 'oportunidade', 'opportunity'].includes(lower)
      }
      return v === 1
    }
    const isOpportunity = oportunidadeValue !== null ? isTruthyValue(oportunidadeValue) : false

    // Build scoped query for deduplication within event
    const scopedQuery = () => supabase.from('participants').select('id').eq('event_id', eventId)

    // Check if participant exists (within this event)
    let existingParticipant = null

    // 1. By CPF (most reliable - present in all forms)
    if (!existingParticipant && cpf) {
      const { data } = await scopedQuery().eq('cpf', cpf).single()
      existingParticipant = data
    }

    // 2. By external_id
    if (!existingParticipant && externalId) {
      const { data } = await scopedQuery().eq('external_id', externalId).single()
      existingParticipant = data
    }

    // 3. By email
    if (!existingParticipant && email) {
      const { data } = await scopedQuery().eq('email', email).single()
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
      tem_acompanhante: temAcompanhante,
      relacao_acompanhante: relacaoAcompanhante,
      companion,
      color,
      qualification,
      funnel: participant.funnel_origin || null,
      funil_origem_id: funilOrigemId,
      seller_closer_name: sellerCloserName,
      seller_closer_id: sellerCloserId,
      category,
      qr_code: qrCode,
      // status removido - conflita com constraint do banco
      is_opportunity: isOpportunity,
      checked_in_day1: checkedInDay1,
      checked_in_day2: checkedInDay2,
      checked_in_day3: checkedInDay3,
      webhook_data: payload,
    }

    // Fields that come from form_data — replace completely on update (include nulls to clear old values)
    const FORM_DERIVED_FIELDS = new Set([
      'cpf', 'phone', 'badge_name', 'niche', 'revenue',
      'photo_url', 'challenge_answer', 'desired_change_answer', 'instagram',
      'partner', 'net_profit', 'tem_acompanhante', 'relacao_acompanhante',
      'companion', 'form_data', 'color', 'qualification',
    ])

    const cleanData = (data: Record<string, any>, isUpdate: boolean) => {
      const result: Record<string, any> = {}
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue
        // On update: only skip nulls for structural fields (not form-derived)
        if (isUpdate && value === null && !FORM_DERIVED_FIELDS.has(key)) continue
        result[key] = value
      }
      return result
    }

    if (existingParticipant) {
      // Update existing participant — form fields are replaced, structural fields are merged
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
