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
function flattenPayload(obj: any, prefix = ''): Record<string, any> {
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
    } else {
      result[fullKey] = value
      if (normKey) {
        result[normKey] = value
      }
    }
  }
  return result
}

// Field aliases for extraction
const FIELD_ALIASES: Array<[string, string[]]> = [
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
  // status removido - conflita com constraint do banco
  ['category', [
    'category', 'categoria', 'tipo_ingresso', 'ticket_type', 'ingresso',
  ]],
  ['cpf', [
    'cpf', 'cnpj', 'cpf_cnpj', 'documento', 'digite_o_seu_cpf_ou_cnpj',
    'digite_seu_cpf', 'document', 'cpf_ou_cnpj',
  ]],
  ['badge_name', [
    'badge_name', 'nome_para_cracha', 'cracha', 'badge', 'nome_cracha',
    'apelido', 'como_quer_ser_chamado',
  ]],
  ['partner', [
    'partner', 'socio', 'voce_tem_socio', 'tem_socio', 'parceiro',
    'has_partner',
  ]],
  ['net_profit', [
    'net_profit', 'lucro_liquido', 'qual_seu_lucro_liquido_mensal', 'lucro',
    'profit', 'lucro_mensal',
  ]],
  ['funnel', [
    'funnel', 'funil', 'origem', 'source', 'canal', 'form_name', 'funnel_origin',
  ]],
  ['challenge_answer', [
    'challenge_answer', 'maior_dificuldade', 'dificuldade', 'challenge',
    'qual_sua_maior_dificuldade_no_seu_negocio_hoje', 'desafio',
    'principal_dificuldade', 'dificuldade_atual', 'qual_a_maior_dificuldade_no_seu_negocio',
  ]],
  ['desired_change_answer', [
    'desired_change_answer', 'o_que_busca', 'objetivo', 'desired_change',
    'o_que_pretende_aprender_no_intensivo_da_alta_performance',
    'o_que_espera', 'expectativa', 'meta', 'o_que_quer_aprender',
    'o_que_voce_pretende_aprender_no_intensivo',
  ]],
  ['photo_url', [
    'photo_url', 'foto', 'foto_perfil', 'foto_url', 'photo', 'profile_photo',
    'qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos', 'imagem', 'avatar',
    'foto_de_perfil', 'adicione_uma_foto_sua_para_perfil',
  ]],
  ['niche', [
    'niche', 'nicho', 'area_atuacao', 'qual_sua_area_de_atuacao_profissional',
    'qual_sua_area_de_atuacao', 'qual_a_sua_area_de_atuacao', 'area_de_atuacao',
    'segmento', 'area', 'setor', 'profissao', 'ramo',
  ]],
  ['revenue', [
    'revenue', 'faturamento', 'quanto_voce_fatura_por_mes', 'faturamento_mensal',
    'receita', 'renda', 'ganho_mensal', 'quanto_fatura', 'qual_o_seu_faturamento_mensal',
  ]],
  ['phone', [
    'phone', 'telefone', 'whatsapp', 'celular', 'digite_seu_whatsapp',
    'numero_whatsapp', 'tel', 'mobile', 'phone_number', 'qual_o_telefone',
    'qual_o_seu_numero_de_telefone',
  ]],
  ['instagram', [
    'instagram', 'insta', 'qual_seu_do_instagram', 'ig', 'instagram_handle',
    'perfil_instagram', 'user_instagram', 'arroba', 'qual_seu_instagram',
  ]],
]

const TEM_ACOMPANHANTE_ALIASES = [
  'tem_acompanhante', 'voce_vai_com_acompanhante', 'vai_com_acompanhante',
  'has_companion', 'com_acompanhante', 'acompanhante_sim_nao',
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

function findValue(flat: Record<string, any>, aliases: string[]): any {
  for (const alias of aliases) {
    if (flat[alias] !== undefined && flat[alias] !== null && flat[alias] !== '') {
      return flat[alias]
    }
    const withFields = `fields.${alias}`
    if (flat[withFields] !== undefined && flat[withFields] !== null && flat[withFields] !== '') {
      return flat[withFields]
    }
  }
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

// Process a single participant's webhook_data
function extractFieldsFromWebhookData(webhookData: any): Record<string, any> {
  const flat = flattenPayload(webhookData)
  const extracted: Record<string, any> = {}

  for (const [dbColumn, aliases] of FIELD_ALIASES) {
    const value = findValue(flat, aliases)
    if (value !== null) {
      extracted[dbColumn] = dbColumn === 'instagram' ? cleanInstagram(String(value)) : value
    }
  }

  // Extract tem_acompanhante
  const rawTemAcompanhante = findValue(flat, TEM_ACOMPANHANTE_ALIASES)
  if (rawTemAcompanhante !== null) {
    extracted.tem_acompanhante = isTruthy(rawTemAcompanhante)
  }

  // Recalculate color and qualification from revenue
  if (extracted.revenue) {
    const color = getColorFromRevenue(extracted.revenue)
    const qualification = getQualificationFromRevenue(extracted.revenue)
    if (color) extracted.color = color
    if (qualification) extracted.qualification = qualification
  }

  return extracted
}

// Also handle the unified webhook format (event.participant structure)
function extractFieldsFromUnifiedFormat(webhookData: any): Record<string, any> {
  const extracted: Record<string, any> = {}

  if (!webhookData?.participant) return extracted

  const participant = webhookData.participant
  const formData = participant.form_data || {}

  // Direct fields from participant object
  if (participant.qr_code) extracted.qr_code = participant.qr_code
  if (participant.category) extracted.category = participant.category
  // status removido - conflita com constraint do banco
  if (participant.setor) extracted.niche = participant.setor
  if (participant.faturamento) extracted.revenue = participant.faturamento
  if (participant.funnel_origin) extracted.funnel = participant.funnel_origin

  // Extract from form_data using normalized key matching
  const formFlat = flattenPayload(formData)

  for (const [dbColumn, aliases] of FIELD_ALIASES) {
    if (extracted[dbColumn]) continue // Skip if already extracted
    const value = findValue(formFlat, aliases)
    if (value !== null) {
      extracted[dbColumn] = dbColumn === 'instagram' ? cleanInstagram(String(value)) : value
    }
  }

  // Recalculate color and qualification
  if (extracted.revenue) {
    const color = getColorFromRevenue(extracted.revenue)
    const qualification = getQualificationFromRevenue(extracted.revenue)
    if (color) extracted.color = color
    if (qualification) extracted.qualification = qualification
  }

  return extracted
}

export async function POST(request: Request) {
  const supabase = getSupabase()

  try {
    const url = new URL(request.url)
    const eventId = url.searchParams.get('event_id')
    const dryRun = url.searchParams.get('dry_run') === 'true'

    // Build query
    let query = supabase
      .from('participants')
      .select('id, name, email, webhook_data')
      .not('webhook_data', 'is', null)

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data: participants, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Erro ao buscar participantes', details: error.message },
        { status: 500 }
      )
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum participante com webhook_data encontrado',
        processed: 0,
      })
    }

    const results = {
      total: participants.length,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const participant of participants) {
      try {
        // Try both extraction methods and merge results
        const extractedGeneric = extractFieldsFromWebhookData(participant.webhook_data)
        const extractedUnified = extractFieldsFromUnifiedFormat(participant.webhook_data)

        // Merge with unified taking precedence for overlapping fields
        const extracted = { ...extractedGeneric, ...extractedUnified }

        // Filter out null/undefined values
        const updateData: Record<string, any> = {}
        for (const [key, value] of Object.entries(extracted)) {
          if (value !== null && value !== undefined && value !== '') {
            updateData[key] = value
          }
        }

        if (Object.keys(updateData).length === 0) {
          results.skipped++
          continue
        }

        if (dryRun) {
          results.details.push({
            id: participant.id,
            name: participant.name,
            fieldsToUpdate: Object.keys(updateData),
            values: updateData,
          })
          results.updated++
        } else {
          const { error: updateError } = await supabase
            .from('participants')
            .update(updateData)
            .eq('id', participant.id)

          if (updateError) {
            results.errors++
            results.details.push({
              id: participant.id,
              name: participant.name,
              error: updateError.message,
            })
          } else {
            results.updated++
          }
        }
      } catch (err: any) {
        results.errors++
        results.details.push({
          id: participant.id,
          name: participant.name,
          error: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      message: dryRun
        ? `Simulação: ${results.updated} participantes seriam atualizados`
        : `${results.updated} participantes atualizados`,
      results,
    })
  } catch (error: any) {
    console.error('Reprocess error:', error)
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
    description: 'Reprocessa participantes existentes para extrair novos campos do webhook_data salvo',
    endpoint: '/api/admin/reprocess-participants',
    method: 'POST',
    parametros: {
      'event_id': 'UUID do evento (opcional - filtra por evento)',
      'dry_run': 'true para simular sem salvar (mostra o que seria atualizado)',
    },
    exemplos: [
      {
        descricao: 'Simular reprocessamento de todos os participantes',
        url: '/api/admin/reprocess-participants?dry_run=true',
      },
      {
        descricao: 'Reprocessar participantes de um evento específico',
        url: '/api/admin/reprocess-participants?event_id=UUID_DO_EVENTO',
      },
      {
        descricao: 'Simular reprocessamento de um evento',
        url: '/api/admin/reprocess-participants?event_id=UUID_DO_EVENTO&dry_run=true',
      },
    ],
    camposExtraidos: [
      'companion (nome do acompanhante)',
      'relacao_acompanhante (tipo: sócio, esposa, etc)',
      'tem_acompanhante (boolean)',
      'qr_code',
      'category (categoria do ingresso)',
      'cpf',
      'badge_name (nome para crachá)',
      'partner (sócio)',
      'net_profit (lucro líquido)',
      'funnel (funil de origem)',
      'challenge_answer (maior dificuldade)',
      'desired_change_answer (o que busca)',
      'photo_url',
      'niche',
      'revenue',
      'phone',
      'instagram',
      'color (recalculado do revenue)',
      'qualification (recalculado do revenue)',
    ],
  })
}
