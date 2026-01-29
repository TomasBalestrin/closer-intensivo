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

    // Extract is_opportunity from webhook payload
    const rawOpportunity = fields?.is_opportunity ?? fields?.oportunidade ?? payload?.is_opportunity ?? payload?.oportunidade
    const is_opportunity = rawOpportunity === true || rawOpportunity === 'true' || rawOpportunity === 'sim' || rawOpportunity === 'Sim' || rawOpportunity === 'yes' || rawOpportunity === '1'

    if (!name) {
      return NextResponse.json(
        { error: 'Nome completo é obrigatório (fields.nome_completo)' },
        { status: 400 }
      )
    }

    // Check if participant exists - priority: external_id > email > cpf > name
    // This prevents duplicates and ensures data is updated correctly
    let existingParticipant = null

    // 1. Check by external_id (most reliable - unique form submission ID)
    if (participant_id) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('external_id', participant_id)
        .single()
      existingParticipant = data
    }

    // 2. Check by email (very reliable identifier)
    if (!existingParticipant && email) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('email', email)
        .single()
      existingParticipant = data
    }

    // 3. Check by CPF (unique document, if available)
    if (!existingParticipant && cpf) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('cpf', cpf)
        .single()
      existingParticipant = data
    }

    // 4. Check by name (last resort - less reliable)
    if (!existingParticipant && name) {
      const { data } = await supabase
        .from('participants')
        .select('id')
        .eq('name', name)
        .single()
      existingParticipant = data
    }

    // Map open-ended answer fields
    const challenge_answer = fields?.qual_sua_maior_dificuldade_no_seu_negocio_hoje || null
    const desired_change_answer = fields?.o_que_pretende_aprender_no_intensivo_da_alta_performance || null

    // Build FULL participantData with ALL fields from the webhook
    const fullParticipantData: Record<string, any> = {
      name,
      email: email || null,
      phone: phone || null,
      photo_url: photo_url || null,
      revenue: revenue || null,
      niche: niche || null,
      instagram,
      external_id: participant_id || null,
      cpf: cpf || null,
      badge_name: badge_name || null,
      partner: partner || null,
      net_profit: net_profit || null,
      challenge_answer,
      desired_change_answer,
      is_opportunity: rawOpportunity !== undefined ? is_opportunity : undefined,
      webhook_data: payload,
    }

    // Basic fields (fallback if full insert fails due to missing columns)
    const basicParticipantData: Record<string, any> = {
      name,
      email: email || null,
      phone: phone || null,
      photo_url: photo_url || null,
      revenue: revenue || null,
      niche: niche || null,
      instagram,
      external_id: participant_id || null,
      is_opportunity: rawOpportunity !== undefined ? is_opportunity : undefined,
    }

    // Helper: try with full data first, fallback to basic if column is missing
    async function upsertParticipant(existingId?: string) {
      const dataToTry = [fullParticipantData, basicParticipantData]

      for (let i = 0; i < dataToTry.length; i++) {
        const data = dataToTry[i]
        const isRetry = i > 0

        if (isRetry) {
          console.warn('Retrying with basic fields only (some columns may not exist in DB)')
        }

        if (existingId) {
          const { error } = await supabase
            .from('participants')
            .update(data)
            .eq('id', existingId)

          if (error) {
            // If column doesn't exist, try with basic data
            if (error.message?.includes('Could not find') && !isRetry) continue
            return { error, data: null }
          }
          return { error: null, data: { id: existingId } }
        } else {
          const { data: newData, error } = await supabase
            .from('participants')
            .insert(data)
            .select('id')
            .single()

          if (error) {
            // If column doesn't exist, try with basic data
            if (error.message?.includes('Could not find') && !isRetry) continue
            return { error, data: null }
          }
          return { error: null, data: newData }
        }
      }

      return { error: new Error('All insert attempts failed'), data: null }
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
      const { error: insertError, data: newParticipant } = await upsertParticipant()

      if (insertError || !newParticipant) {
        console.error('Error creating participant:', insertError)
        return NextResponse.json(
          { error: 'Erro ao criar participante', details: (insertError as any)?.message || String(insertError) },
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
        is_opportunity: 'boolean | string (true/false/sim/não)',
        oportunidade: 'string (alias para is_opportunity)',
      },
      is_opportunity: 'boolean | string (campo raiz alternativo)',
      oportunidade: 'string (campo raiz alternativo)',
    },
  })
}
