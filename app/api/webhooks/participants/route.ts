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

// Remove accented characters (é→e, ã→a, ç→c, etc.)
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeKey(key: string): string {
  return removeAccents(key.toLowerCase()).replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

// Flatten any nested JSON into a flat key-value map
// Handles nested objects AND arrays of {label, value} / {field, answer} pairs
function flattenPayload(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  if (!obj || typeof obj !== 'object') return result

  // Handle arrays: look for label/value or field/answer patterns
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        const label = item.label || item.field || item.name || item.key || item.question || item.titulo || item.ref
        const value = item.value ?? item.answer ?? item.text ?? item.response ?? item.resposta
        if (label && value !== undefined && value !== null) {
          const normLabel = normalizeKey(String(label))
          if (normLabel) {
            result[normLabel] = value
            result[String(label)] = value
          }
        } else {
          Object.assign(result, flattenPayload(item, prefix))
        }
      }
    }
    return result
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const normKey = normalizeKey(key)

    if (value !== null && value !== undefined && typeof value === 'object') {
      // Recurse into nested objects and arrays
      Object.assign(result, flattenPayload(value, fullKey))
    } else {
      result[fullKey] = value
      if (normKey) {
        result[normKey] = value
      }
    }
  }
  return result
}

// Define aliases for each participant field
// Each entry: [dbColumn, [...possible key patterns]]
// Patterns are matched case-insensitively against normalized keys
const FIELD_ALIASES: Array<[string, string[]]> = [
  ['name', [
    'nome_completo', 'nome', 'name', 'full_name', 'fullname', 'participant_name',
    'nome_do_participante', 'nome_participante', 'primeiro_nome',
  ]],
  ['email', [
    'login_value', 'email', 'e_mail', 'digite_seu_melhor_email', 'melhor_email', 'email_participante',
    'participant_email', 'endereco_email',
  ]],
  ['phone', [
    'phone', 'telefone', 'whatsapp', 'celular', 'digite_seu_whatsapp',
    'numero_whatsapp', 'tel', 'mobile', 'phone_number',
  ]],
  ['instagram', [
    'instagram', 'insta', 'qual_seu_do_instagram', 'ig', 'instagram_handle',
    'perfil_instagram', 'user_instagram', 'arroba',
  ]],
  ['cpf', [
    'cpf', 'cnpj', 'cpf_cnpj', 'documento', 'digite_o_seu_cpf_ou_cnpj',
    'digite_seu_cpf', 'document', 'cpf_ou_cnpj',
  ]],
  ['niche', [
    'niche', 'nicho', 'area_atuacao', 'qual_sua_area_de_atuacao_profissional',
    'segmento', 'area', 'setor', 'profissao', 'ramo',
  ]],
  ['revenue', [
    'revenue', 'faturamento', 'quanto_voce_fatura_por_mes', 'faturamento_mensal',
    'receita', 'renda', 'ganho_mensal', 'quanto_fatura',
  ]],
  ['net_profit', [
    'net_profit', 'lucro_liquido', 'qual_seu_lucro_liquido_mensal', 'lucro',
    'profit', 'lucro_mensal',
  ]],
  ['badge_name', [
    'badge_name', 'nome_para_cracha', 'cracha', 'badge', 'nome_cracha',
    'apelido', 'como_quer_ser_chamado',
  ]],
  ['partner', [
    'partner', 'socio', 'voce_tem_socio', 'tem_socio', 'parceiro',
    'has_partner',
  ]],
  ['companion', [
    'companion', 'acompanhante', 'nome_acompanhante', 'nome_do_acompanhante',
    'qual_o_nome_e_sobrenome_do_seu_acompanhante', 'acompanhante_nome',
  ]],
  ['relacao_acompanhante', [
    'relacao_acompanhante', 'seu_acompanhante_e', 'tipo_acompanhante',
    'relacao_com_acompanhante', 'quem_e_acompanhante',
  ]],
  ['qr_code', [
    'qr_code', 'qrcode', 'codigo_qr', 'code',
  ]],
  ['status', [
    'status', 'participant_status', 'estado',
  ]],
  ['category', [
    'category', 'categoria', 'tipo_ingresso', 'ticket_type', 'ingresso',
  ]],
  ['photo_url', [
    'photo_url', 'foto', 'foto_perfil', 'foto_url', 'photo', 'profile_photo',
    'qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos', 'imagem', 'avatar',
    'foto_de_perfil',
  ]],
  ['funnel', [
    'funnel', 'funil', 'origem', 'source', 'canal', 'form_name',
  ]],
  ['challenge_answer', [
    'challenge_answer', 'maior_dificuldade', 'dificuldade', 'challenge',
    'qual_sua_maior_dificuldade_no_seu_negocio_hoje', 'desafio',
    'principal_dificuldade', 'dificuldade_atual',
  ]],
  ['desired_change_answer', [
    'desired_change_answer', 'o_que_busca', 'objetivo', 'desired_change',
    'o_que_pretende_aprender_no_intensivo_da_alta_performance',
    'o_que_espera', 'expectativa', 'meta', 'o_que_quer_aprender',
  ]],
]

// Aliases for boolean fields
const OPPORTUNITY_ALIASES = [
  'is_opportunity', 'oportunidade', 'opportunity', 'e_oportunidade',
  'eh_oportunidade', 'oport',
]

const TEM_ACOMPANHANTE_ALIASES = [
  'tem_acompanhante', 'voce_vai_com_acompanhante', 'vai_com_acompanhante',
  'has_companion', 'com_acompanhante', 'acompanhante_sim_nao',
]

// Aliases for external ID
const EXTERNAL_ID_ALIASES = [
  'participant_id', 'external_id', 'id_externo', 'form_id', 'submission_id',
  'lead_id', 'id',
]

function cleanInstagram(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') return null
  return value.replace(/^@/, '').trim() || null
}

function isTruthy(value: any): boolean {
  if (value === true) return true
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    return ['true', 'sim', 'yes', '1', 's'].includes(v)
  }
  return value === 1
}

// Find the first matching value from flat payload using alias list
function findValue(flat: Record<string, any>, aliases: string[]): any {
  // 1. Direct match on alias or fields.alias
  for (const alias of aliases) {
    if (flat[alias] !== undefined && flat[alias] !== null && flat[alias] !== '') {
      return flat[alias]
    }
    const withFields = `fields.${alias}`
    if (flat[withFields] !== undefined && flat[withFields] !== null && flat[withFields] !== '') {
      return flat[withFields]
    }
  }
  // 2. Fallback: substring matching (only aliases with 3+ chars to avoid false positives)
  const flatKeys = Object.keys(flat)
  for (const alias of aliases) {
    if (alias.length < 3) continue
    for (const key of flatKeys) {
      if (flat[key] === undefined || flat[key] === null || flat[key] === '') continue
      const normKey = normalizeKey(key)
      if (!normKey || normKey.length < 3) continue
      if (normKey.includes(alias) || alias.includes(normKey)) {
        return flat[key]
      }
    }
  }
  return null
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  try {
    // Extract event_id from query parameters
    const url = new URL(request.url)
    const eventId = url.searchParams.get('event_id')

    // Validate event_id if provided
    if (eventId) {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single()

      if (eventError || !eventData) {
        return NextResponse.json(
          { error: 'Evento não encontrado. Verifique o event_id na URL.', event_id: eventId },
          { status: 400 }
        )
      }
    }

    const payload = await request.json()

    // Log the webhook
    const { data: logData, error: logError } = await supabase
      .from('webhooks_log')
      .insert({ payload, processed: false })
      .select('id')
      .single()

    const logId = logData?.id
    if (logError) {
      console.error('Error logging webhook:', logError)
    }

    // Flatten the entire payload for flexible field matching
    const flat = flattenPayload(payload)

    // Extract all participant fields using aliases
    const extracted: Record<string, any> = {}
    for (const [dbColumn, aliases] of FIELD_ALIASES) {
      const value = findValue(flat, aliases)
      if (value !== null) {
        extracted[dbColumn] = dbColumn === 'instagram' ? cleanInstagram(String(value)) : value
      }
    }

    // Extract external ID
    const externalId = findValue(flat, EXTERNAL_ID_ALIASES)

    // Extract checkin fields (checkin1/2/3 with timestamps or booleans)
    const CHECKIN_ALIASES: Array<[string, string[]]> = [
      ['checked_in_day1', ['checkin1', 'checkin_1', 'check_in_1', 'checked_in_day1', 'credenciamento_dia1', 'credenciamento_1']],
      ['checked_in_day2', ['checkin2', 'checkin_2', 'check_in_2', 'checked_in_day2', 'credenciamento_dia2', 'credenciamento_2']],
      ['checked_in_day3', ['checkin3', 'checkin_3', 'check_in_3', 'checked_in_day3', 'credenciamento_dia3', 'credenciamento_3']],
    ]

    const checkinData: Record<string, boolean> = {}
    for (const [dbColumn, aliases] of CHECKIN_ALIASES) {
      // Use direct key lookup to avoid substring false positives between checkin1/checkin2/checkin3
      let rawValue = undefined
      for (const alias of aliases) {
        if (flat[alias] !== undefined) {
          rawValue = flat[alias]
          break
        }
        const withFields = `fields.${alias}`
        if (flat[withFields] !== undefined) {
          rawValue = flat[withFields]
          break
        }
      }
      if (rawValue !== undefined) {
        // A non-null timestamp or truthy value means checked in
        checkinData[dbColumn] = rawValue !== null && rawValue !== false && rawValue !== 'false' && rawValue !== '' && rawValue !== 0
      }
    }

    // Extract opportunity flag
    const rawOpportunity = findValue(flat, OPPORTUNITY_ALIASES)
    const hasOpportunityField = rawOpportunity !== null
    const is_opportunity = hasOpportunityField ? isTruthy(rawOpportunity) : undefined

    // Extract tem_acompanhante flag
    const rawTemAcompanhante = findValue(flat, TEM_ACOMPANHANTE_ALIASES)
    const tem_acompanhante = rawTemAcompanhante !== null ? isTruthy(rawTemAcompanhante) : undefined

    // Name is the only required field
    const name = extracted.name
    if (!name) {
      return NextResponse.json(
        {
          error: 'Nome não encontrado no payload. Envie um campo com o nome do participante.',
          hint: 'Campos aceitos: nome_completo, nome, name, full_name, etc.',
          receivedKeys: Object.keys(flat).slice(0, 30),
        },
        { status: 400 }
      )
    }

    // Calculate color and qualification from revenue
    const color = getColorFromRevenue(extracted.revenue) || null
    const qualification = getQualificationFromRevenue(extracted.revenue) || null

    // Check if participant already exists (scoped by event_id if provided)
    let existingParticipant = null

    // Helper to build scoped queries
    const scopedQuery = () => {
      let query = supabase.from('participants').select('id')
      if (eventId) query = query.eq('event_id', eventId)
      return query
    }

    // 1. By external_id
    if (externalId) {
      const { data } = await scopedQuery().eq('external_id', externalId).single()
      existingParticipant = data
    }

    // 2. By email
    if (!existingParticipant && extracted.email) {
      const { data } = await scopedQuery().eq('email', extracted.email).single()
      existingParticipant = data
    }

    // 3. By CPF
    if (!existingParticipant && extracted.cpf) {
      const { data } = await scopedQuery().eq('cpf', extracted.cpf).single()
      existingParticipant = data
    }

    // 4. By name (last resort)
    if (!existingParticipant) {
      const { data } = await scopedQuery().eq('name', name).single()
      existingParticipant = data
    }

    // Build participant data from extracted fields
    const participantData: Record<string, any> = {
      name,
      email: extracted.email || null,
      phone: extracted.phone || null,
      photo_url: extracted.photo_url || null,
      revenue: extracted.revenue || null,
      niche: extracted.niche || null,
      instagram: extracted.instagram || null,
      external_id: externalId || null,
      cpf: extracted.cpf || null,
      badge_name: extracted.badge_name || null,
      partner: extracted.partner || null,
      net_profit: extracted.net_profit || null,
      funnel: extracted.funnel || null,
      challenge_answer: extracted.challenge_answer || null,
      desired_change_answer: extracted.desired_change_answer || null,
      companion: extracted.companion || null,
      relacao_acompanhante: extracted.relacao_acompanhante || null,
      qr_code: extracted.qr_code || null,
      status: extracted.status || null,
      category: extracted.category || null,
      color,
      qualification,
      webhook_data: payload,
      ...checkinData,
    }

    // Associate with event if event_id provided
    if (eventId) {
      participantData.event_id = eventId
    }

    if (is_opportunity !== undefined) {
      participantData.is_opportunity = is_opportunity
    }

    if (tem_acompanhante !== undefined) {
      participantData.tem_acompanhante = tem_acompanhante
    }

    // Remove null values for updates (don't overwrite existing data with null)
    const cleanData = (data: Record<string, any>, isUpdate: boolean) => {
      const result: Record<string, any> = {}
      for (const [key, value] of Object.entries(data)) {
        if (isUpdate && value === null) continue // skip nulls on update
        if (value === undefined) continue
        result[key] = value
      }
      return result
    }

    // Helper: try insert/update with fallback if columns don't exist
    async function upsertParticipant(existingId?: string) {
      const isUpdate = !!existingId
      const data = cleanData(participantData, isUpdate)

      // Ensure name is always present for inserts
      if (!isUpdate) {
        data.name = name
      }

      if (existingId) {
        const { error } = await supabase
          .from('participants')
          .update(data)
          .eq('id', existingId)

        if (error) {
          // Retry without potentially missing columns
          const basicData = cleanData({
            name, email: extracted.email, phone: extracted.phone,
            photo_url: extracted.photo_url, revenue: extracted.revenue,
            niche: extracted.niche, instagram: extracted.instagram,
            external_id: externalId, webhook_data: payload,
            ...(is_opportunity !== undefined ? { is_opportunity } : {}),
          }, true)

          const { error: retryError } = await supabase
            .from('participants')
            .update(basicData)
            .eq('id', existingId)

          if (retryError) return { error: retryError, data: null }
          return { error: null, data: { id: existingId } }
        }
        return { error: null, data: { id: existingId } }
      } else {
        const { data: newData, error } = await supabase
          .from('participants')
          .insert(data)
          .select('id')
          .single()

        if (error) {
          // Retry with basic fields
          const basicData: Record<string, any> = {
            name, email: extracted.email || null, phone: extracted.phone || null,
            photo_url: extracted.photo_url || null, revenue: extracted.revenue || null,
            niche: extracted.niche || null, instagram: extracted.instagram || null,
            external_id: externalId || null, webhook_data: payload,
          }
          if (is_opportunity !== undefined) basicData.is_opportunity = is_opportunity

          const { data: retryData, error: retryError } = await supabase
            .from('participants')
            .insert(basicData)
            .select('id')
            .single()

          if (retryError) return { error: retryError, data: null }
          return { error: null, data: retryData }
        }
        return { error: null, data: newData }
      }
    }

    if (existingParticipant) {
      const { error: updateError } = await upsertParticipant(existingParticipant.id)

      if (updateError) {
        console.error('Error updating participant:', updateError)
        return NextResponse.json(
          { error: 'Erro ao atualizar participante', details: (updateError as any).message || String(updateError) },
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
        fieldsExtracted: Object.keys(extracted),
      })
    } else {
      const { error: insertError, data: newParticipant } = await upsertParticipant()

      if (insertError || !newParticipant) {
        console.error('Error creating participant:', insertError)
        return NextResponse.json(
          { error: 'Erro ao criar participante', details: (insertError as any)?.message || String(insertError) },
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
        fieldsExtracted: Object.keys(extracted),
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

// GET for testing / documentation
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook de participantes ativo. Aceita qualquer estrutura JSON.',
    description: 'O webhook detecta automaticamente os campos do participante independente da estrutura do JSON. Suporta dados em qualquer nivel de aninhamento.',
    camposDetectados: {
      nome: 'nome_completo, nome, name, full_name, etc. (OBRIGATÓRIO)',
      email: 'email, e_mail, digite_seu_melhor_email, etc.',
      telefone: 'phone, telefone, whatsapp, celular, etc.',
      instagram: 'instagram, insta, ig, etc.',
      cpf: 'cpf, cnpj, cpf_cnpj, documento, etc.',
      nicho: 'niche, nicho, area_atuacao, segmento, etc.',
      faturamento: 'revenue, faturamento, receita, etc.',
      lucro: 'net_profit, lucro_liquido, lucro, etc.',
      cracha: 'badge_name, nome_para_cracha, cracha, etc.',
      socio: 'partner, socio, voce_tem_socio, etc.',
      foto: 'photo_url, foto, foto_perfil, etc.',
      funil: 'funnel, funil, origem, source, canal, etc.',
      dificuldade: 'challenge_answer, maior_dificuldade, dificuldade, etc.',
      objetivo: 'desired_change_answer, o_que_busca, objetivo, etc.',
      acompanhante: 'companion, nome_acompanhante, etc.',
      relacao_acompanhante: 'seu_acompanhante_e, tipo_acompanhante, etc.',
      tem_acompanhante: 'voce_vai_com_acompanhante (boolean/SIM/NAO)',
      qr_code: 'qr_code, qrcode, codigo_qr, etc.',
      categoria: 'category, categoria, tipo_ingresso, etc.',
      status: 'status, participant_status, etc.',
      oportunidade: 'is_opportunity, oportunidade (boolean/string)',
      id_externo: 'participant_id, external_id, form_id, etc.',
    },
    exemplos: [
      {
        descricao: 'Formato com fields (aninhado)',
        payload: {
          participant_id: '123',
          fields: {
            nome_completo: 'João Silva',
            email: 'joao@email.com',
            whatsapp: '11999999999',
          },
        },
      },
      {
        descricao: 'Formato plano',
        payload: {
          nome: 'Maria Santos',
          email: 'maria@email.com',
          telefone: '11888888888',
          faturamento: 'R$ 10.000,00 até R$ 20.000,00',
          nicho: 'Marketing Digital',
        },
      },
      {
        descricao: 'Formato diferente',
        payload: {
          full_name: 'Pedro Lima',
          e_mail: 'pedro@email.com',
          instagram: '@pedrolima',
          revenue: 'R$ 5.000,00 até R$ 10.000,00',
        },
      },
    ],
  })
}
