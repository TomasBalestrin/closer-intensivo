#!/usr/bin/env npx tsx
/**
 * Script para reprocessar participantes existentes e extrair novos campos do webhook_data
 *
 * Uso: npx tsx scripts/reprocess-participants.ts
 *
 * Variáveis de ambiente necessárias:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

// Load env from .env.local if available
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Color/qualification mapping
const REVENUE_RANGES = [
  { min: 0, max: 5000, color: 'Vermelho', qualification: 'Iniciante' },
  { min: 5000, max: 10000, color: 'Laranja', qualification: 'Básico' },
  { min: 10000, max: 20000, color: 'Amarelo', qualification: 'Intermediário' },
  { min: 20000, max: 50000, color: 'Verde', qualification: 'Avançado' },
  { min: 50000, max: 100000, color: 'Azul', qualification: 'Expert' },
  { min: 100000, max: Infinity, color: 'Preto', qualification: 'Elite' },
]

function parseRevenue(value: any): number | null {
  if (!value) return null
  const str = String(value)
  const matches = str.match(/[\d.,]+/g)
  if (!matches) return null
  const numbers = matches.map(m => parseFloat(m.replace(/\./g, '').replace(',', '.')))
  return numbers.length > 0 ? Math.max(...numbers) : null
}

function getColorFromRevenue(revenue: any): string | null {
  const value = parseRevenue(revenue)
  if (value === null) return null
  for (const range of REVENUE_RANGES) {
    if (value >= range.min && value < range.max) return range.color
  }
  return null
}

function getQualificationFromRevenue(revenue: any): string | null {
  const value = parseRevenue(revenue)
  if (value === null) return null
  for (const range of REVENUE_RANGES) {
    if (value >= range.min && value < range.max) return range.qualification
  }
  return null
}

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeKey(key: string): string {
  return removeAccents(key.toLowerCase()).replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

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

const FIELD_ALIASES: Array<[string, string[]]> = [
  ['companion', ['companion', 'acompanhante', 'nome_acompanhante', 'nome_do_acompanhante', 'qual_o_nome_e_sobrenome_do_seu_acompanhante', 'acompanhante_nome']],
  ['relacao_acompanhante', ['relacao_acompanhante', 'seu_acompanhante_e', 'tipo_acompanhante', 'relacao_com_acompanhante', 'quem_e_acompanhante']],
  ['qr_code', ['qr_code', 'qrcode', 'codigo_qr', 'code']],
  ['status', ['status', 'participant_status', 'estado']],
  ['category', ['category', 'categoria', 'tipo_ingresso', 'ticket_type', 'ingresso']],
  ['cpf', ['cpf', 'cnpj', 'cpf_cnpj', 'documento', 'digite_o_seu_cpf_ou_cnpj', 'digite_seu_cpf', 'document', 'cpf_ou_cnpj']],
  ['badge_name', ['badge_name', 'nome_para_cracha', 'cracha', 'badge', 'nome_cracha', 'apelido', 'como_quer_ser_chamado']],
  ['partner', ['partner', 'socio', 'voce_tem_socio', 'tem_socio', 'parceiro', 'has_partner']],
  ['net_profit', ['net_profit', 'lucro_liquido', 'qual_seu_lucro_liquido_mensal', 'lucro', 'profit', 'lucro_mensal']],
  ['funnel', ['funnel', 'funil', 'origem', 'source', 'canal', 'form_name', 'funnel_origin']],
  ['challenge_answer', ['challenge_answer', 'maior_dificuldade', 'dificuldade', 'challenge', 'qual_sua_maior_dificuldade_no_seu_negocio_hoje', 'desafio', 'principal_dificuldade', 'dificuldade_atual', 'qual_a_maior_dificuldade_no_seu_negocio']],
  ['desired_change_answer', ['desired_change_answer', 'o_que_busca', 'objetivo', 'desired_change', 'o_que_pretende_aprender_no_intensivo_da_alta_performance', 'o_que_espera', 'expectativa', 'meta', 'o_que_quer_aprender', 'o_que_voce_pretende_aprender_no_intensivo']],
  ['photo_url', ['photo_url', 'foto', 'foto_perfil', 'foto_url', 'photo', 'profile_photo', 'qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos', 'imagem', 'avatar', 'foto_de_perfil', 'adicione_uma_foto_sua_para_perfil']],
  ['niche', ['niche', 'nicho', 'area_atuacao', 'qual_sua_area_de_atuacao_profissional', 'segmento', 'area', 'setor', 'profissao', 'ramo', 'qual_a_sua_area_de_atuacao']],
  ['revenue', ['revenue', 'faturamento', 'quanto_voce_fatura_por_mes', 'faturamento_mensal', 'receita', 'renda', 'ganho_mensal', 'quanto_fatura', 'qual_o_seu_faturamento_mensal']],
  ['phone', ['phone', 'telefone', 'whatsapp', 'celular', 'digite_seu_whatsapp', 'numero_whatsapp', 'tel', 'mobile', 'phone_number', 'qual_o_telefone', 'qual_o_seu_numero_de_telefone']],
  ['instagram', ['instagram', 'insta', 'qual_seu_do_instagram', 'ig', 'instagram_handle', 'perfil_instagram', 'user_instagram', 'arroba', 'qual_seu_instagram']],
]

const TEM_ACOMPANHANTE_ALIASES = ['tem_acompanhante', 'voce_vai_com_acompanhante', 'vai_com_acompanhante', 'has_companion', 'com_acompanhante', 'acompanhante_sim_nao']

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
    if (flat[alias] !== undefined && flat[alias] !== null && flat[alias] !== '') return flat[alias]
    const withFields = `fields.${alias}`
    if (flat[withFields] !== undefined && flat[withFields] !== null && flat[withFields] !== '') return flat[withFields]
  }
  const flatKeys = Object.keys(flat)
  for (const alias of aliases) {
    if (alias.length < 3) continue
    for (const key of flatKeys) {
      if (flat[key] === undefined || flat[key] === null || flat[key] === '') continue
      const normKey = normalizeKey(key)
      if (!normKey || normKey.length < 3) continue
      if (normKey.includes(alias) || alias.includes(normKey)) return flat[key]
    }
  }
  return null
}

function extractFieldsFromWebhookData(webhookData: any): Record<string, any> {
  const flat = flattenPayload(webhookData)
  const extracted: Record<string, any> = {}

  for (const [dbColumn, aliases] of FIELD_ALIASES) {
    const value = findValue(flat, aliases)
    if (value !== null) {
      extracted[dbColumn] = dbColumn === 'instagram' ? cleanInstagram(String(value)) : value
    }
  }

  const rawTemAcompanhante = findValue(flat, TEM_ACOMPANHANTE_ALIASES)
  if (rawTemAcompanhante !== null) {
    extracted.tem_acompanhante = isTruthy(rawTemAcompanhante)
  }

  if (extracted.revenue) {
    const color = getColorFromRevenue(extracted.revenue)
    const qualification = getQualificationFromRevenue(extracted.revenue)
    if (color) extracted.color = color
    if (qualification) extracted.qualification = qualification
  }

  return extracted
}

function extractFieldsFromUnifiedFormat(webhookData: any): Record<string, any> {
  const extracted: Record<string, any> = {}
  if (!webhookData?.participant) return extracted

  const participant = webhookData.participant
  const formData = participant.form_data || {}

  if (participant.qr_code) extracted.qr_code = participant.qr_code
  if (participant.category) extracted.category = participant.category
  if (participant.status) extracted.status = participant.status
  if (participant.setor) extracted.niche = participant.setor
  if (participant.faturamento) extracted.revenue = participant.faturamento
  if (participant.funnel_origin) extracted.funnel = participant.funnel_origin

  const formFlat = flattenPayload(formData)
  for (const [dbColumn, aliases] of FIELD_ALIASES) {
    if (extracted[dbColumn]) continue
    const value = findValue(formFlat, aliases)
    if (value !== null) {
      extracted[dbColumn] = dbColumn === 'instagram' ? cleanInstagram(String(value)) : value
    }
  }

  if (extracted.revenue) {
    const color = getColorFromRevenue(extracted.revenue)
    const qualification = getQualificationFromRevenue(extracted.revenue)
    if (color) extracted.color = color
    if (qualification) extracted.qualification = qualification
  }

  return extracted
}

async function main() {
  console.log('🔄 Iniciando reprocessamento de participantes...\n')

  const { data: participants, error } = await supabase
    .from('participants')
    .select('id, name, email, webhook_data')
    .not('webhook_data', 'is', null)

  if (error) {
    console.error('❌ Erro ao buscar participantes:', error.message)
    process.exit(1)
  }

  if (!participants || participants.length === 0) {
    console.log('✅ Nenhum participante com webhook_data encontrado.')
    process.exit(0)
  }

  console.log(`📊 ${participants.length} participantes encontrados com webhook_data\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const participant of participants) {
    try {
      const extractedGeneric = extractFieldsFromWebhookData(participant.webhook_data)
      const extractedUnified = extractFieldsFromUnifiedFormat(participant.webhook_data)
      const extracted = { ...extractedGeneric, ...extractedUnified }

      const updateData: Record<string, any> = {}
      for (const [key, value] of Object.entries(extracted)) {
        if (value !== null && value !== undefined && value !== '') {
          updateData[key] = value
        }
      }

      if (Object.keys(updateData).length === 0) {
        skipped++
        continue
      }

      const { error: updateError } = await supabase
        .from('participants')
        .update(updateData)
        .eq('id', participant.id)

      if (updateError) {
        console.error(`❌ Erro ao atualizar ${participant.name}:`, updateError.message)
        errors++
      } else {
        console.log(`✓ ${participant.name}: ${Object.keys(updateData).join(', ')}`)
        updated++
      }
    } catch (err: any) {
      console.error(`❌ Erro ao processar ${participant.name}:`, err.message)
      errors++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Reprocessamento concluído!`)
  console.log(`   Atualizados: ${updated}`)
  console.log(`   Sem alterações: ${skipped}`)
  console.log(`   Erros: ${errors}`)
}

main().catch(console.error)
