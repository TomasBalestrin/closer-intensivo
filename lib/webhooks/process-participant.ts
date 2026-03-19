import { createClient } from '@supabase/supabase-js'
import { getColorFromRevenue, getQualificationFromRevenue } from '@/lib/utils'
import { onParticipanteCriado, onParticipanteAtualizado } from './triggers'

// ─── Supabase Helper ────────────────────────────────────────────────────────

export function getWebhookSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// ─── String Utilities ───────────────────────────────────────────────────────

export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeKey(key: string): string {
  return removeAccents(key.toLowerCase()).replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

export function tryParseJSON(str: string): any {
  if (typeof str !== 'string') return null
  const trimmed = str.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

export function cleanInstagram(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') return null
  return value.replace(/^@/, '').trim() || null
}

export function isTruthy(value: any): boolean {
  if (value === true) return true
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    return ['true', 'sim', 'yes', '1', 's', 'oportunidade', 'opportunity'].includes(v)
  }
  return value === 1
}

// ─── Payload Flattening ─────────────────────────────────────────────────────

export function flattenPayload(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  if (!obj || typeof obj !== 'object') return result

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
      Object.assign(result, flattenPayload(value, fullKey))
    } else if (typeof value === 'string') {
      const parsed = tryParseJSON(value)
      if (parsed && typeof parsed === 'object') {
        Object.assign(result, flattenPayload(parsed, fullKey))
      }
      result[fullKey] = value
      if (normKey) {
        result[normKey] = value
      }
    } else {
      result[fullKey] = value
      if (normKey) {
        result[normKey] = value
      }
    }
  }
  return result
}

// ─── Field Alias Definitions ────────────────────────────────────────────────

export const FIELD_ALIASES: Array<[string, string[]]> = [
  ['name', [
    'nome_completo', 'nome', 'name', 'full_name', 'fullname', 'participant_name',
    'nome_do_participante', 'nome_participante', 'primeiro_nome',
    'digite_seu_nome_completo',
  ]],
  ['email', [
    'login_value', 'email', 'e_mail', 'digite_seu_melhor_email', 'melhor_email', 'email_participante',
    'participant_email', 'endereco_email',
  ]],
  ['phone', [
    'phone', 'telefone', 'whatsapp', 'celular', 'digite_seu_whatsapp',
    'numero_whatsapp', 'tel', 'mobile', 'phone_number',
    'qual_o_seu_numero_de_telefone', 'numero_de_telefone',
  ]],
  ['instagram', [
    'instagram', 'insta', 'qual_seu_do_instagram', 'qual_o_do_seu_instagram',
    'ig', 'instagram_handle', 'perfil_instagram', 'user_instagram', 'arroba',
    'seu_instagram', 'qual_seu_instagram', 'qual_e_o_seu_instagram',
    'informe_seu_instagram', 'digite_seu_instagram', 'instagram_pessoal',
  ]],
  ['cpf', [
    'cpf', 'cnpj', 'cpf_cnpj', 'documento', 'digite_o_seu_cpf_ou_cnpj',
    'digite_seu_cpf', 'document', 'cpf_ou_cnpj',
  ]],
  ['niche', [
    'niche', 'nicho', 'area_atuacao', 'qual_sua_area_de_atuacao_profissional',
    'qual_sua_area_de_atuacao', 'qual_a_sua_area_de_atuacao', 'area_de_atuacao',
    'segmento', 'profissao', 'ramo',
  ]],
  ['revenue', [
    'revenue', 'faturamento', 'quanto_voce_fatura_por_mes', 'faturamento_mensal',
    'qual_o_seu_faturamento_mensal', 'receita', 'renda', 'ganho_mensal', 'quanto_fatura',
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
  ['category', [
    'category', 'categoria', 'tipo_ingresso', 'ticket_type', 'ingresso', 'setor',
  ]],
  ['photo_url', [
    'photo_url', 'foto', 'foto_perfil', 'foto_url', 'photo', 'profile_photo',
    'qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos', 'imagem', 'avatar',
    'foto_de_perfil', 'adicione_uma_foto_sua_para_perfil',
  ]],
  ['funnel', [
    'funnel', 'funil', 'origem', 'source', 'canal', 'form_name',
    'funnel_origin', 'origem_funil',
  ]],
  ['challenge_answer', [
    'challenge_answer', 'maior_dificuldade', 'dificuldade', 'challenge',
    'qual_sua_maior_dificuldade_no_seu_negocio_hoje', 'desafio',
    'principal_dificuldade', 'dificuldade_atual',
    'qual_a_maior_dificuldade_no_seu_negocio',
  ]],
  ['desired_change_answer', [
    'desired_change_answer', 'o_que_busca', 'objetivo', 'desired_change',
    'o_que_pretende_aprender_no_intensivo_da_alta_performance',
    'o_que_espera', 'expectativa', 'meta', 'o_que_quer_aprender',
    'o_que_voce_pretende_aprender_no_intensivo',
  ]],
  ['seller_closer_name', [
    'closer', 'vendedor', 'consultor', 'atendente', 'responsavel',
    'closer_indicado', 'indicado', 'indicacao', 'quem_indicou',
    'indicado_por', 'convidado_por', 'indicador', 'seller',
    'representante', 'consultor_vendas', 'vendedor_responsavel',
  ]],
]

export const OPPORTUNITY_ALIASES = [
  'is_opportunity', 'oportunidade', 'opportunity', 'e_oportunidade',
  'eh_oportunidade', 'oport',
]

export const TEM_ACOMPANHANTE_ALIASES = [
  'tem_acompanhante', 'voce_vai_com_acompanhante', 'vai_com_acompanhante',
  'has_companion', 'com_acompanhante', 'acompanhante_sim_nao',
]

export const EXTERNAL_ID_ALIASES = [
  'participant_id', 'external_id', 'id_externo', 'form_id', 'submission_id',
  'lead_id', 'id', 'contact_id', 'subscriber_id', 'user_id',
]

export const ENVELOPE_KEYS = [
  'context_blob', 'context', 'envelope', 'data', 'payload', 'body',
  'form_data', 'formdata', 'fields', 'answers', 'responses', 'metadata',
  'participant_data', 'lead_data', 'contact_data', 'custom_fields',
]

export const CHECKIN_ALIASES: Array<[string, string[]]> = [
  ['checked_in_day1', ['checkin1', 'checkin_1', 'check_in_1', 'checked_in_day1', 'credenciamento_dia1', 'credenciamento_1']],
  ['checked_in_day2', ['checkin2', 'checkin_2', 'check_in_2', 'checked_in_day2', 'credenciamento_dia2', 'credenciamento_2']],
  ['checked_in_day3', ['checkin3', 'checkin_3', 'check_in_3', 'checked_in_day3', 'credenciamento_dia3', 'credenciamento_3']],
]

// ─── Field Value Finding ────────────────────────────────────────────────────

export function findValue(flat: Record<string, any>, aliases: string[]): any {
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

// ─── Lookups ────────────────────────────────────────────────────────────────

export async function lookupFunilOrigemId(
  supabase: any,
  funnelName: string | null,
  eventId: string | null
): Promise<string | null> {
  if (!funnelName || typeof funnelName !== 'string' || !eventId) return null

  const trimmed = funnelName.trim()
  if (!trimmed) return null

  const { data: byName } = await supabase
    .from('funis_origem')
    .select('id')
    .eq('event_id', eventId)
    .eq('ativo', true)
    .ilike('nome', trimmed)
    .single()

  if (byName?.id) return byName.id

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

  const { data: byPartial } = await supabase
    .from('funis_origem')
    .select('id')
    .eq('event_id', eventId)
    .eq('ativo', true)
    .ilike('nome', `%${trimmed}%`)
    .single()

  return byPartial?.id || null
}

export async function lookupCloserByName(
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

// ─── Field Extraction ───────────────────────────────────────────────────────

export interface ExtractedParticipantFields {
  [key: string]: any
}

/**
 * Extract participant fields from any webhook payload format.
 * CRITICAL: Only returns fields that were actually found in the payload.
 * Missing fields are simply absent from the returned object — they are NOT set to null.
 */
export function extractParticipantFields(payload: any): ExtractedParticipantFields {
  // Pre-process: check for known envelope keys with serialized JSON
  let processedPayload = { ...payload }
  for (const envKey of ENVELOPE_KEYS) {
    if (processedPayload[envKey] && typeof processedPayload[envKey] === 'string') {
      const parsed = tryParseJSON(processedPayload[envKey])
      if (parsed) {
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          processedPayload = { ...processedPayload, ...parsed }
        }
        processedPayload[`${envKey}_parsed`] = parsed
      }
    }
  }

  // Flatten the entire payload for flexible field matching
  const flat = flattenPayload(processedPayload)

  // Extract fields using aliases — only include fields that were actually found
  const extracted: ExtractedParticipantFields = {}
  for (const [dbColumn, aliases] of FIELD_ALIASES) {
    const value = findValue(flat, aliases)
    if (value !== null) {
      extracted[dbColumn] = dbColumn === 'instagram' ? cleanInstagram(String(value)) : value
    }
  }

  // Extract external ID
  const externalId = findValue(flat, EXTERNAL_ID_ALIASES)
  if (externalId !== null) {
    extracted.external_id = externalId
  }

  // Extract checkin fields (direct key lookup to avoid cross-day false positives)
  for (const [dbColumn, aliases] of CHECKIN_ALIASES) {
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
      extracted[dbColumn] = rawValue !== null && rawValue !== false && rawValue !== 'false' && rawValue !== '' && rawValue !== 0
    }
  }

  // Extract checkin_days format (day_1/day_2/day_3 with status strings)
  const checkinDays = payload.checkin_days || {}
  if (checkinDays.day_1 !== undefined) {
    const status = String(checkinDays.day_1).toLowerCase().replace(/[_\s-]/g, '')
    if (status === 'checkedin' || status === 'checkin') {
      extracted.checked_in_day1 = true
    }
  }
  if (checkinDays.day_2 !== undefined) {
    const status = String(checkinDays.day_2).toLowerCase().replace(/[_\s-]/g, '')
    if (status === 'checkedin' || status === 'checkin') {
      extracted.checked_in_day2 = true
    }
  }
  if (checkinDays.day_3 !== undefined) {
    const status = String(checkinDays.day_3).toLowerCase().replace(/[_\s-]/g, '')
    if (status === 'checkedin' || status === 'checkin') {
      extracted.checked_in_day3 = true
    }
  }

  // Extract opportunity flag
  const rawOpportunity = findValue(flat, OPPORTUNITY_ALIASES)
  if (rawOpportunity !== null) {
    extracted.is_opportunity = isTruthy(rawOpportunity)
  }

  // Extract tem_acompanhante flag
  const rawTemAcompanhante = findValue(flat, TEM_ACOMPANHANTE_ALIASES)
  if (rawTemAcompanhante !== null) {
    extracted.tem_acompanhante = isTruthy(rawTemAcompanhante)
  }

  return extracted
}

/**
 * Extract participant fields from structured format (participant.form_data).
 * Used by unified and evento routes. Falls back to flat extraction for extra fields.
 */
export function extractParticipantFieldsStructured(payload: any): ExtractedParticipantFields {
  const participant = payload.participant || payload
  const formData = participant.form_data || payload.fields || {}
  const checkinDays = payload.checkin_days || {}

  // Start with flat extraction of the whole payload (catches everything)
  const extracted = extractParticipantFields(payload)

  // Override with explicit top-level participant fields (they take precedence)
  if (participant.name) extracted.name = participant.name
  if (participant.email) extracted.email = participant.email
  if (participant.id && !extracted.external_id) extracted.external_id = participant.id
  if (participant.faturamento && !extracted.revenue) extracted.revenue = participant.faturamento
  if (participant.closer && !extracted.seller_closer_name) extracted.seller_closer_name = participant.closer
  if (participant.category) extracted.category = participant.category
  if (participant.setor && !extracted.category) extracted.category = participant.setor
  if (participant.qr_code || participant.qrcode) extracted.qr_code = participant.qr_code || participant.qrcode
  if (participant.funnel_origin) extracted.funnel = participant.funnel_origin
  if (participant.instagram) extracted.instagram = cleanInstagram(participant.instagram)

  // Extract opportunity from participant object
  const oportunidadeValue = participant.oportunidade ??
                            participant.is_opportunity ??
                            payload.oportunidade ??
                            payload.is_opportunity ??
                            null
  if (oportunidadeValue !== null && extracted.is_opportunity === undefined) {
    extracted.is_opportunity = isTruthy(oportunidadeValue)
  }

  // Process checkin_days format
  if (checkinDays.day_1 !== undefined) {
    const status = String(checkinDays.day_1).toLowerCase().replace(/[_\s-]/g, '')
    if (status === 'checkedin' || status === 'checkin') {
      extracted.checked_in_day1 = true
    }
  }
  if (checkinDays.day_2 !== undefined) {
    const status = String(checkinDays.day_2).toLowerCase().replace(/[_\s-]/g, '')
    if (status === 'checkedin' || status === 'checkin') {
      extracted.checked_in_day2 = true
    }
  }
  if (checkinDays.day_3 !== undefined) {
    const status = String(checkinDays.day_3).toLowerCase().replace(/[_\s-]/g, '')
    if (status === 'checkedin' || status === 'checkin') {
      extracted.checked_in_day3 = true
    }
  }

  return extracted
}

// ─── Deduplication ──────────────────────────────────────────────────────────

export async function findExistingParticipant(
  supabase: any,
  fields: ExtractedParticipantFields,
  eventId?: string | null
): Promise<{ id: string } | null> {
  const scopedQuery = () => {
    let query = supabase.from('participants').select('id')
    if (eventId) query = query.eq('event_id', eventId)
    return query
  }

  // 1. By CPF (most reliable)
  if (fields.cpf) {
    const { data } = await scopedQuery().eq('cpf', fields.cpf).single()
    if (data) return data
  }

  // 2. By external_id
  if (fields.external_id) {
    const { data } = await scopedQuery().eq('external_id', fields.external_id).single()
    if (data) return data
  }

  // 3. By email
  if (fields.email) {
    const { data } = await scopedQuery().eq('email', fields.email).single()
    if (data) return data
  }

  // 4. By QR code
  if (fields.qr_code) {
    const { data } = await scopedQuery().eq('qr_code', fields.qr_code).single()
    if (data) return data
  }

  // 5. By name (case-insensitive for robustness)
  if (fields.name) {
    const { data } = await scopedQuery().ilike('name', fields.name.trim()).single()
    if (data) return data
  }

  return null
}

// ─── Build Participant Data ─────────────────────────────────────────────────

interface BuildDataOptions {
  eventId?: string | null
  payload?: any
  isUpdate: boolean
  sellerCloserId?: string | null
  funilOrigemId?: string | null
  autoAssignCloserId?: string | null
}

/**
 * Build the data object for insert/update.
 * CRITICAL FIX: Only includes fields that were actually extracted from the webhook.
 * Fields not present in the webhook are simply omitted — they will NOT be set to null.
 */
export function buildParticipantData(
  extracted: ExtractedParticipantFields,
  options: BuildDataOptions
): Record<string, any> {
  const data: Record<string, any> = {}

  // Map extracted fields directly (only present ones)
  const directFields = [
    'name', 'email', 'phone', 'instagram', 'cpf', 'niche', 'revenue',
    'net_profit', 'badge_name', 'partner', 'companion', 'relacao_acompanhante',
    'qr_code', 'category', 'photo_url', 'funnel',
    'challenge_answer', 'desired_change_answer', 'seller_closer_name',
    'external_id', 'is_opportunity', 'tem_acompanhante',
    'checked_in_day1', 'checked_in_day2', 'checked_in_day3',
  ]

  for (const field of directFields) {
    if (extracted[field] !== undefined) {
      data[field] = extracted[field]
    }
  }

  // Compute derived fields only if source data is present
  if (extracted.revenue !== undefined) {
    data.color = getColorFromRevenue(extracted.revenue) || null
    data.qualification = getQualificationFromRevenue(extracted.revenue) || null
  }

  // Add lookup results if available
  if (options.sellerCloserId !== undefined) {
    data.seller_closer_id = options.sellerCloserId
  }
  if (options.funilOrigemId !== undefined) {
    data.funil_origem_id = options.funilOrigemId
  }
  if (options.autoAssignCloserId) {
    data.assigned_closer_id = options.autoAssignCloserId
  }

  // Always save raw payload for debugging
  if (options.payload) {
    data.webhook_data = options.payload
  }

  // Associate with event
  if (options.eventId) {
    data.event_id = options.eventId
  }

  // For updates, remove undefined values (shouldn't exist, but safety)
  // For inserts, ensure name is present
  if (!options.isUpdate && extracted.name) {
    data.name = extracted.name
  }

  return data
}

// ─── Upsert ─────────────────────────────────────────────────────────────────

export interface UpsertResult {
  action: 'created' | 'updated'
  participantId: string
}

const BASIC_FIELDS = new Set([
  'name', 'email', 'phone', 'photo_url', 'revenue', 'niche',
  'instagram', 'external_id', 'webhook_data', 'is_opportunity', 'event_id',
])

export async function upsertParticipant(
  supabase: any,
  data: Record<string, any>,
  existingId?: string
): Promise<UpsertResult> {
  if (existingId) {
    // UPDATE — only send fields that are in data (missing fields are NOT touched)
    const { data: updated, error } = await supabase
      .from('participants')
      .update(data)
      .eq('id', existingId)
      .select('id')
      .single()

    if (error) {
      // Retry with basic fields only (schema mismatch resilience)
      const basicData: Record<string, any> = {}
      for (const [key, value] of Object.entries(data)) {
        if (BASIC_FIELDS.has(key)) {
          basicData[key] = value
        }
      }

      const { error: retryError } = await supabase
        .from('participants')
        .update(basicData)
        .eq('id', existingId)
        .select('id')
        .single()

      if (retryError) throw retryError
    }

    return { action: 'updated', participantId: existingId }
  } else {
    // INSERT
    const { data: newData, error } = await supabase
      .from('participants')
      .insert(data)
      .select('id')
      .single()

    if (error) {
      // Retry with basic fields only
      const basicData: Record<string, any> = {}
      for (const [key, value] of Object.entries(data)) {
        if (BASIC_FIELDS.has(key)) {
          basicData[key] = value
        }
      }
      // Ensure name for insert
      if (data.name) basicData.name = data.name

      const { data: retryData, error: retryError } = await supabase
        .from('participants')
        .insert(basicData)
        .select('id')
        .single()

      if (retryError) throw retryError
      return { action: 'created', participantId: retryData.id }
    }

    return { action: 'created', participantId: newData.id }
  }
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

export interface ProcessOptions {
  eventId?: string | null
  structuredFormat?: boolean
  autoAssignCloser?: boolean
}

export interface ProcessResult {
  action: 'created' | 'updated'
  participantId: string
  name: string
  fieldsExtracted: string[]
}

/**
 * Main function to process a participant webhook.
 * Handles extraction, deduplication, upsert, and outbound triggers.
 */
export async function processParticipantWebhook(
  supabase: any,
  payload: any,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const { eventId = null, structuredFormat = false, autoAssignCloser = false } = options

  // 1. Extract fields from payload
  const extracted = structuredFormat
    ? extractParticipantFieldsStructured(payload)
    : extractParticipantFields(payload)

  // Validate: name is required
  if (!extracted.name) {
    throw new WebhookValidationError(
      'Nome não encontrado no payload. Envie um campo com o nome do participante.',
      { hint: 'Campos aceitos: nome_completo, nome, name, full_name, etc.' }
    )
  }

  // 2. Look up seller/closer by name
  let sellerCloserId: string | null = null
  if (extracted.seller_closer_name) {
    sellerCloserId = await lookupCloserByName(supabase, extracted.seller_closer_name)
  }

  // 3. Look up funil_origem_id
  let funilOrigemId: string | null = null
  if (extracted.funnel) {
    funilOrigemId = await lookupFunilOrigemId(supabase, extracted.funnel, eventId) || null
  }

  // 4. Find existing participant
  const existing = await findExistingParticipant(supabase, extracted, eventId)

  // 5. Auto-assign closer if enabled
  let autoAssignCloserId: string | null = null
  if (autoAssignCloser && sellerCloserId && eventId) {
    const { data: userEventEntry } = await supabase
      .from('user_events')
      .select('user_id')
      .eq('user_id', sellerCloserId)
      .eq('event_id', eventId)
      .eq('role', 'closer')
      .single()

    if (userEventEntry) {
      if (existing) {
        // Only auto-assign if currently unassigned
        const { data: currentParticipant } = await supabase
          .from('participants')
          .select('assigned_closer_id')
          .eq('id', existing.id)
          .single()

        if (!currentParticipant?.assigned_closer_id) {
          autoAssignCloserId = sellerCloserId
        }
      } else {
        autoAssignCloserId = sellerCloserId
      }
    }
  }

  // 6. Build participant data
  const participantData = buildParticipantData(extracted, {
    eventId,
    payload,
    isUpdate: !!existing,
    sellerCloserId: sellerCloserId !== null ? sellerCloserId : undefined,
    funilOrigemId: funilOrigemId !== null ? funilOrigemId : undefined,
    autoAssignCloserId,
  })

  // 7. Upsert
  const result = await upsertParticipant(supabase, participantData, existing?.id)

  // 8. Fire outbound triggers (non-blocking)
  try {
    const { data: fullParticipant } = await supabase
      .from('participants')
      .select('*')
      .eq('id', result.participantId)
      .single()

    if (fullParticipant) {
      if (result.action === 'created') {
        onParticipanteCriado(fullParticipant).catch(err =>
          console.error('Trigger onParticipanteCriado failed:', err)
        )
      } else {
        onParticipanteAtualizado(fullParticipant).catch(err =>
          console.error('Trigger onParticipanteAtualizado failed:', err)
        )
      }
    }
  } catch (err) {
    console.error('Failed to fetch participant for triggers:', err)
  }

  return {
    action: result.action,
    participantId: result.participantId,
    name: extracted.name,
    fieldsExtracted: Object.keys(extracted),
  }
}

// ─── Error Types ────────────────────────────────────────────────────────────

export class WebhookValidationError extends Error {
  public details: Record<string, any>

  constructor(message: string, details: Record<string, any> = {}) {
    super(message)
    this.name = 'WebhookValidationError'
    this.details = details
  }
}
