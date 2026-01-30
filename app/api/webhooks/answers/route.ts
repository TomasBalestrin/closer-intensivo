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
    const payload = await request.json()

    // Log the webhook
    await supabase
      .from('webhooks_log')
      .insert({ payload, processed: false })

    // Support both nested (fields) and flat payload structures
    const fields = payload.fields || payload
    const participant_id = payload.participant_id || fields.participant_id

    // Extract identification fields (priority: external_id > email > cpf > name)
    const email = fields?.digite_seu_melhor_email || fields?.email || null
    const cpf = fields?.digite_o_seu_cpf_ou_cnpj || fields?.cpf || null
    const name = fields?.nome_completo || fields?.nome || fields?.name || null

    // Extract answer fields - flexible field naming
    const challenge_answer =
      fields?.qual_sua_maior_dificuldade_no_seu_negocio_hoje ||
      fields?.maior_dificuldade ||
      fields?.dificuldade ||
      fields?.challenge ||
      fields?.challenge_answer ||
      null

    const desired_change_answer =
      fields?.o_que_pretende_aprender_no_intensivo_da_alta_performance ||
      fields?.o_que_busca ||
      fields?.objetivo ||
      fields?.desired_change ||
      fields?.desired_change_answer ||
      null

    if (!challenge_answer && !desired_change_answer) {
      return NextResponse.json(
        {
          error: 'Pelo menos um campo de resposta é obrigatório',
          expected_fields: [
            'qual_sua_maior_dificuldade_no_seu_negocio_hoje (ou: maior_dificuldade, dificuldade, challenge)',
            'o_que_pretende_aprender_no_intensivo_da_alta_performance (ou: o_que_busca, objetivo, desired_change)',
          ],
        },
        { status: 400 }
      )
    }

    // Find participant - priority: external_id > email > cpf > name
    let existingParticipant = null

    if (participant_id) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('external_id', participant_id)
        .single()
      existingParticipant = data
    }

    if (!existingParticipant && email) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('email', email)
        .single()
      existingParticipant = data
    }

    if (!existingParticipant && cpf) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('cpf', cpf)
        .single()
      existingParticipant = data
    }

    if (!existingParticipant && name) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('name', name)
        .single()
      existingParticipant = data
    }

    if (!existingParticipant) {
      return NextResponse.json(
        {
          error: 'Participante não encontrado',
          searched: {
            external_id: participant_id || null,
            email,
            cpf,
            name,
          },
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
    await supabase
      .from('webhooks_log')
      .update({ processed: true })
      .eq('payload', payload)

    return NextResponse.json({
      success: true,
      participantId: existingParticipant.id,
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
    message: 'Webhook de respostas ativo. Envie POST com dados do participante e respostas.',
    expectedPayload: {
      participant_id: 'string (ID externo - opcional, para identificação)',
      fields: {
        _identification: 'Use um dos campos abaixo para identificar o participante:',
        digite_seu_melhor_email: 'string (email do participante)',
        digite_o_seu_cpf_ou_cnpj: 'string (CPF/CNPJ)',
        nome_completo: 'string (nome - fallback)',
        _answers: 'Campos de resposta (pelo menos um obrigatório):',
        qual_sua_maior_dificuldade_no_seu_negocio_hoje: 'string (dificuldade principal)',
        o_que_pretende_aprender_no_intensivo_da_alta_performance: 'string (o que busca)',
      },
      _aliases: {
        dificuldade: 'Alias para qual_sua_maior_dificuldade_no_seu_negocio_hoje',
        maior_dificuldade: 'Alias para qual_sua_maior_dificuldade_no_seu_negocio_hoje',
        o_que_busca: 'Alias para o_que_pretende_aprender_no_intensivo_da_alta_performance',
        objetivo: 'Alias para o_que_pretende_aprender_no_intensivo_da_alta_performance',
      },
    },
    example: {
      fields: {
        digite_seu_melhor_email: 'participante@email.com',
        qual_sua_maior_dificuldade_no_seu_negocio_hoje: 'Escalar as vendas sem perder qualidade',
        o_que_pretende_aprender_no_intensivo_da_alta_performance: 'Técnicas de fechamento e gestão de equipe',
      },
    },
  })
}
