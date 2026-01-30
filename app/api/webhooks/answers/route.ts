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

// Flatten any nested JSON into a flat key-value map
function flattenPayload(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  if (!obj || typeof obj !== 'object') return result

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')

    if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenPayload(value, fullKey))
    } else {
      result[fullKey] = value
      result[normalizedKey] = value
    }
  }
  return result
}

// Find first matching value from flat payload
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
  return null
}

// Aliases for the two answer fields
const CHALLENGE_ALIASES = [
  'challenge_answer', 'challenge',
  'qual_sua_maior_dificuldade_no_seu_negocio_hoje',
  'maior_dificuldade', 'dificuldade', 'desafio',
  'principal_dificuldade', 'dificuldade_atual',
  'qual_e_sua_maior_dificuldade', 'dificuldade_negocio',
  'qual_maior_dificuldade', 'obstáculo', 'obstaculo',
  'problema_principal', 'desafio_atual',
]

const DESIRED_CHANGE_ALIASES = [
  'desired_change_answer', 'desired_change',
  'o_que_pretende_aprender_no_intensivo_da_alta_performance',
  'o_que_busca', 'objetivo', 'meta', 'expectativa',
  'o_que_espera', 'o_que_quer_aprender', 'o_que_deseja',
  'o_que_pretende', 'aprendizado', 'resultado_esperado',
  'o_que_quer_alcançar', 'o_que_quer_alcancar',
  'objetivo_intensivo', 'expectativa_intensivo',
]

// Aliases for participant identification
const ID_ALIASES = ['participant_id', 'external_id', 'id_externo', 'form_id', 'submission_id', 'lead_id', 'id']
const EMAIL_ALIASES = ['email', 'e_mail', 'digite_seu_melhor_email', 'melhor_email', 'email_participante']
const CPF_ALIASES = ['cpf', 'cnpj', 'cpf_cnpj', 'documento', 'digite_o_seu_cpf_ou_cnpj']
const NAME_ALIASES = ['nome_completo', 'nome', 'name', 'full_name', 'fullname', 'nome_participante']

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
          receivedKeys: Object.keys(flat).slice(0, 30),
        },
        { status: 400 }
      )
    }

    // Find participant - priority: external_id > email > cpf > name
    let existingParticipant = null

    if (externalId) {
      const { data } = await supabase
        .from('participants')
        .select('id, name')
        .eq('external_id', externalId)
        .single()
      existingParticipant = data
    }

    if (!existingParticipant && email) {
      const { data } = await supabase
        .from('participants')
        .select('id, name')
        .eq('email', email)
        .single()
      existingParticipant = data
    }

    if (!existingParticipant && cpf) {
      const { data } = await supabase
        .from('participants')
        .select('id, name')
        .eq('cpf', cpf)
        .single()
      existingParticipant = data
    }

    if (!existingParticipant && name) {
      const { data } = await supabase
        .from('participants')
        .select('id, name')
        .eq('name', name)
        .single()
      existingParticipant = data
    }

    if (!existingParticipant) {
      return NextResponse.json(
        {
          error: 'Participante não encontrado',
          hint: 'Inclua no JSON um campo de identificação (email, cpf, nome, id externo) para localizar o participante.',
          searched: { external_id: externalId, email, cpf, name },
        },
        { status: 404 }
      )
    }

    // Build update data - only include non-null fields
    const updateData: Record<string, any> = {}
    if (challenge_answer) updateData.challenge_answer = challenge_answer
    if (desired_change_answer) updateData.desired_change_answer = desired_change_answer

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

    // Mark webhook as processed
    if (logId) {
      await supabase.from('webhooks_log').update({ processed: true }).eq('id', logId)
    }

    return NextResponse.json({
      success: true,
      participantId: existingParticipant.id,
      participantName: existingParticipant.name,
      updated: Object.keys(updateData),
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
    message: 'Webhook de respostas ativo. Aceita qualquer estrutura JSON.',
    description: 'Detecta automaticamente os campos de dificuldade e objetivo do participante em qualquer formato de JSON. Suporta dados aninhados ou planos.',
    campos: {
      identificacao: 'email, cpf, nome, participant_id (qualquer um para localizar o participante)',
      dificuldade: 'Qualquer campo com: dificuldade, desafio, challenge, maior_dificuldade, etc.',
      objetivo: 'Qualquer campo com: objetivo, o_que_busca, desired_change, expectativa, meta, etc.',
    },
    exemplos: [
      {
        descricao: 'Formato aninhado',
        payload: {
          fields: {
            email: 'joao@email.com',
            qual_sua_maior_dificuldade_no_seu_negocio_hoje: 'Escalar vendas',
            o_que_pretende_aprender_no_intensivo_da_alta_performance: 'Gestão de equipe',
          },
        },
      },
      {
        descricao: 'Formato plano simples',
        payload: {
          nome: 'João Silva',
          dificuldade: 'Escalar vendas sem perder qualidade',
          objetivo: 'Aprender técnicas de fechamento',
        },
      },
      {
        descricao: 'Outro formato',
        payload: {
          email: 'maria@email.com',
          desafio: 'Gestão financeira',
          o_que_busca: 'Controle de fluxo de caixa',
        },
      },
    ],
  })
}
