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
        // Pattern: { label: "Email", value: "test@test.com" }
        const label = item.label || item.field || item.name || item.key || item.question || item.titulo || item.ref
        const value = item.value ?? item.answer ?? item.text ?? item.response ?? item.resposta
        if (label && value !== undefined && value !== null) {
          const normLabel = normalizeKey(String(label))
          if (normLabel) {
            result[normLabel] = value
            result[String(label)] = value
          }
        } else {
          // Recurse into the item anyway
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

// Find first matching value from flat payload
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
    if (alias.length < 3) continue // skip short aliases like "id"
    for (const key of flatKeys) {
      if (flat[key] === undefined || flat[key] === null || flat[key] === '') continue
      const normKey = normalizeKey(key)
      if (!normKey || normKey.length < 3) continue // skip short/empty keys
      if (normKey.includes(alias) || alias.includes(normKey)) {
        return flat[key]
      }
    }
  }
  return null
}

// Aliases for the two answer fields (platform field names first for fast matching)
const CHALLENGE_ALIASES = [
  'qual_sua_maior_dificuldade_no_seu_negocio_hoje',
  'challenge_answer', 'challenge',
  'maior_dificuldade', 'dificuldade', 'desafio',
  'principal_dificuldade', 'dificuldade_atual',
  'qual_e_sua_maior_dificuldade', 'dificuldade_negocio',
  'qual_maior_dificuldade', 'obstaculo',
  'problema_principal', 'desafio_atual',
]

const DESIRED_CHANGE_ALIASES = [
  'o_que_pretende_aprender_no_intensivo_da_alta_performance',
  'desired_change_answer', 'desired_change',
  'o_que_busca', 'objetivo', 'meta', 'expectativa',
  'o_que_espera', 'o_que_quer_aprender', 'o_que_deseja',
  'o_que_pretende', 'aprendizado', 'resultado_esperado',
  'o_que_quer_alcancar',
  'objetivo_intensivo', 'expectativa_intensivo',
  'mudanca_desejada', 'o_que_espera_do_evento',
]

// Aliases for participant identification
// login_value is the root-level email field sent by the platform
const ID_ALIASES = ['participant_id', 'external_id', 'id_externo', 'form_id', 'submission_id', 'lead_id']
const EMAIL_ALIASES = ['login_value', 'email', 'e_mail', 'digite_seu_melhor_email', 'melhor_email', 'email_participante']
const CPF_ALIASES = ['cpf', 'cnpj', 'cpf_cnpj', 'documento', 'digite_o_seu_cpf_ou_cnpj']
const NAME_ALIASES = ['nome_completo', 'nome', 'name', 'full_name', 'fullname', 'nome_participante']

export async function POST(request: Request) {
  const supabase = getSupabase()
  try {
    // Extract event_id from query parameters
    const reqUrl = new URL(request.url)
    const eventId = reqUrl.searchParams.get('event_id')

    const payload = await request.json()

    // Log the webhook
    let logId: string | undefined
    try {
      const { data: logData } = await supabase
        .from('webhooks_log')
        .insert({ payload, processed: false })
        .select('id')
        .single()
      logId = logData?.id
    } catch (logErr) {
      console.error('Failed to log webhook:', logErr)
    }

    // Flatten payload for flexible field matching
    const flat = flattenPayload(payload)

    // Extract identification fields
    const externalId = findValue(flat, ID_ALIASES)
    const email = findValue(flat, EMAIL_ALIASES)
    const cpf = findValue(flat, CPF_ALIASES)
    const name = findValue(flat, NAME_ALIASES)

    // Extract the two answer fields from any JSON structure
    const challenge_answer = findValue(flat, CHALLENGE_ALIASES)
    const desired_change_answer = findValue(flat, DESIRED_CHANGE_ALIASES)

    if (!challenge_answer && !desired_change_answer) {
      return NextResponse.json(
        {
          error: 'Nenhuma resposta encontrada no payload.',
          hint: 'O webhook aceita qualquer estrutura JSON. Basta incluir campos com nomes relacionados a dificuldade/desafio e/ou objetivo/o que busca.',
          camposAceitos: {
            dificuldade: CHALLENGE_ALIASES.slice(0, 6),
            objetivo: DESIRED_CHANGE_ALIASES.slice(0, 6),
          },
          debug: {
            receivedKeys: Object.keys(flat).slice(0, 50),
            flatSample: Object.fromEntries(
              Object.entries(flat).slice(0, 20).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 100) : v])
            ),
          },
        },
        { status: 400 }
      )
    }

    // Helper to build scoped queries by event
    const scopedQuery = () => {
      let query = supabase.from('participants').select('id, name')
      if (eventId) query = query.eq('event_id', eventId)
      return query
    }

    // Find participant - priority: external_id > email > cpf > name (case-insensitive)
    let existingParticipant = null

    if (externalId) {
      const { data } = await scopedQuery().eq('external_id', externalId).single()
      existingParticipant = data
    }

    if (!existingParticipant && email) {
      const { data } = await scopedQuery().ilike('email', email).single()
      existingParticipant = data
    }

    if (!existingParticipant && cpf) {
      const { data } = await scopedQuery().eq('cpf', cpf).single()
      existingParticipant = data
    }

    if (!existingParticipant && name) {
      const { data } = await scopedQuery().ilike('name', name).limit(1).single()
      existingParticipant = data
    }

    if (!existingParticipant) {
      return NextResponse.json(
        {
          error: 'Participante não encontrado',
          hint: 'Inclua no JSON um campo de identificação (email, cpf, nome, id externo) para localizar o participante.',
          searched: { external_id: externalId, email, cpf, name },
          debug: {
            receivedKeys: Object.keys(flat).slice(0, 50),
          },
        },
        { status: 404 }
      )
    }

    // Fetch current answers to avoid overwriting existing data
    const { data: currentData } = await supabase
      .from('participants')
      .select('challenge_answer, desired_change_answer')
      .eq('id', existingParticipant.id)
      .single()

    // Build update data - only add answers that don't already exist
    const updateData: Record<string, any> = {}
    if (challenge_answer && !currentData?.challenge_answer) {
      updateData.challenge_answer = challenge_answer
    }
    if (desired_change_answer && !currentData?.desired_change_answer) {
      updateData.desired_change_answer = desired_change_answer
    }

    if (Object.keys(updateData).length === 0) {
      // Mark webhook as processed even if nothing to update
      if (logId) {
        await supabase.from('webhooks_log').update({ processed: true }).eq('id', logId)
      }

      return NextResponse.json({
        success: true,
        action: 'skipped',
        participantId: existingParticipant.id,
        participantName: existingParticipant.name,
        message: 'Participante já possui respostas preenchidas. Nenhum dado sobrescrito.',
        existing: {
          challenge_answer: !!currentData?.challenge_answer,
          desired_change_answer: !!currentData?.desired_change_answer,
        },
      })
    }

    const { error: updateError } = await supabase
      .from('participants')
      .update(updateData)
      .eq('id', existingParticipant.id)

    if (updateError) {
      console.error('Error updating participant answers:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar respostas', details: updateError.message },
        { status: 500 }
      )
    }

    // Check if participant has a completed DISC form with answers — trigger analysis automatically
    let analysisTriggered = false
    try {
      const { data: discForm } = await supabase
        .from('disc_forms')
        .select('id, answers, completed_at')
        .eq('participant_id', existingParticipant.id)
        .not('answers', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Also check if participant already has DISC profile (skip if already analyzed)
      const { data: participantCheck } = await supabase
        .from('participants')
        .select('disc_profile, challenge_answer, desired_change_answer')
        .eq('id', existingParticipant.id)
        .single()

      const hasDiscAnswers = discForm?.answers && typeof discForm.answers === 'object' && Object.keys(discForm.answers).length > 0
      const alreadyAnalyzed = !!participantCheck?.disc_profile

      if (hasDiscAnswers && !alreadyAnalyzed) {
        // Trigger analysis in the background (non-blocking)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'

        fetch(`${baseUrl}/api/forms/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: existingParticipant.id,
            formId: discForm.id,
            answers: discForm.answers,
            challengeAnswer: updateData.challenge_answer || participantCheck?.challenge_answer || '',
            desiredChangeAnswer: updateData.desired_change_answer || participantCheck?.desired_change_answer || '',
          }),
        }).catch(err => console.error('Auto-analysis trigger failed:', err))

        analysisTriggered = true
      }
    } catch (err) {
      // Non-critical — analysis can always be triggered manually
      console.error('Error checking for auto-analysis:', err)
    }

    // Mark webhook as processed
    if (logId) {
      await supabase.from('webhooks_log').update({ processed: true }).eq('id', logId)
    }

    return NextResponse.json({
      success: true,
      participantId: existingParticipant.id,
      participantName: existingParticipant.name,
      updated: Object.keys(updateData),
      analysisTriggered,
    })
  } catch (error: any) {
    console.error('Answers webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET for documentation/testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook de respostas ativo. Recebe dados da plataforma de eventos e salva as duas respostas do participante.',
    description: 'Extrai as respostas de dificuldade e objetivo do participante a partir do payload da plataforma. Identifica o participante por participant_id, login_value, email, cpf ou nome.',
    campos_extraidos: {
      dificuldade: 'fields.qual_sua_maior_dificuldade_no_seu_negocio_hoje',
      objetivo: 'fields.o_que_pretende_aprender_no_intensivo_da_alta_performance',
    },
    identificacao: {
      prioridade_1: 'participant_id (root) → busca por external_id no banco',
      prioridade_2: 'login_value (root) ou fields.digite_seu_melhor_email → busca por email',
      prioridade_3: 'fields.digite_o_seu_cpf_ou_cnpj → busca por cpf',
      prioridade_4: 'fields.nome_completo → busca por nome',
    },
    exemplo_payload_plataforma: {
      form: { id: '...', name: 'Participante - Standard' },
      event: { id: '...', name: 'Intensivo Da Alta Performance' },
      fields: {
        nome_completo: 'João Silva',
        digite_seu_melhor_email: 'joao@email.com',
        digite_o_seu_cpf_ou_cnpj: '123.456.789-00',
        qual_sua_maior_dificuldade_no_seu_negocio_hoje: 'Escalar vendas sem perder qualidade',
        o_que_pretende_aprender_no_intensivo_da_alta_performance: 'Gestão de equipe e processos',
      },
      login_value: 'joao@email.com',
      participant_id: '3b036105-18c1-44ec-8858-0830493e4774',
      status: 'registered',
    },
    nota: 'Apenas as duas perguntas (dificuldade e objetivo) são salvas. Os demais campos são usados apenas para identificar o participante.',
  })
}
