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

// Clean instagram handle (remove @ if present)
function cleanInstagram(value: string | undefined): string | null {
  if (!value) return null
  return value.replace(/^@/, '').trim() || null
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  try {
    const payload = await request.json()

    // Log the webhook
    const { error: logError } = await supabase
      .from('webhooks_log')
      .insert({
        payload,
        processed: false,
      })

    if (logError) {
      console.error('Error logging webhook:', logError)
    }

    // New format: data is nested in 'fields'
    const { participant_id, form_name, event_name, status, created_at, fields } = payload

    // Map fields to participant data
    const name = fields?.nome_completo
    const email = fields?.digite_seu_melhor_email
    const phone = fields?.digite_seu_whatsapp
    const instagram = cleanInstagram(fields?.qual_seu_do_instagram)
    const cpf = fields?.digite_o_seu_cpf_ou_cnpj
    const badge_name = fields?.nome_para_cracha
    const partner = fields?.voce_tem_socio
    const niche = fields?.qual_sua_area_de_atuacao_profissional
    const revenue = fields?.quanto_voce_fatura_por_mes
    const net_profit = fields?.qual_seu_lucro_liquido_mensal
    const photo_url = fields?.qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos

    if (!name) {
      return NextResponse.json(
        { error: 'Nome completo é obrigatório (fields.nome_completo)' },
        { status: 400 }
      )
    }

    // Check if participant exists by external_id first, then by name
    let existingParticipant = null

    if (participant_id) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('external_id', participant_id)
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

    // Build participantData with only fields that exist in the database
    // Note: challenge_answer and desired_change_answer are set by the form analysis API
    const participantData: Record<string, any> = {
      name,
      email: email || null,
      phone: phone || null,
      photo_url: photo_url || null,
      revenue: revenue || null,
      niche: niche || null,
      instagram,
      external_id: participant_id || null,
    }

    // Optional fields - only include if the webhook provides them
    if (cpf) participantData.cpf = cpf
    if (badge_name) participantData.badge_name = badge_name
    if (partner) participantData.partner = partner
    if (net_profit) participantData.net_profit = net_profit

    if (existingParticipant) {
      // Update existing participant
      const { error: updateError } = await supabase
        .from('participants')
        .update(participantData)
        .eq('id', existingParticipant.id)

      if (updateError) {
        console.error('Error updating participant:', updateError)
        return NextResponse.json(
          { error: 'Erro ao atualizar participante', details: updateError.message },
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
        action: 'updated',
        participantId: existingParticipant.id,
        name,
      })
    } else {
      // Create new participant
      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert(participantData)
        .select('id')
        .single()

      if (insertError) {
        console.error('Error creating participant:', insertError)
        return NextResponse.json(
          { error: 'Erro ao criar participante', details: insertError.message },
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
        action: 'created',
        participantId: newParticipant.id,
        name,
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

// Allow GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint ativo. Envie requisições POST com dados do participante.',
    expectedPayload: {
      participant_id: 'string (ID externo do formulário)',
      form_name: 'string',
      event_name: 'string',
      status: 'string (registered, etc)',
      created_at: 'timestamp',
      fields: {
        nome_completo: 'string (obrigatório)',
        digite_seu_melhor_email: 'string',
        digite_seu_whatsapp: 'string',
        qual_seu_do_instagram: 'string',
        digite_o_seu_cpf_ou_cnpj: 'string',
        nome_para_cracha: 'string',
        voce_tem_socio: 'string (Sim/Não)',
        qual_sua_area_de_atuacao_profissional: 'string',
        o_que_pretende_aprender_no_intensivo_da_alta_performance: 'string',
        qual_sua_maior_dificuldade_no_seu_negocio_hoje: 'string',
        quanto_voce_fatura_por_mes: 'string',
        qual_seu_lucro_liquido_mensal: 'string',
        qual_sua_melhor_foto_de_perfil_para_lhe_conhecermos: 'string (URL)',
      },
    },
  })
}
