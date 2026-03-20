import { NextResponse } from 'next/server'
import {
  getWebhookSupabase,
  processParticipantWebhook,
  WebhookValidationError,
} from '@/lib/webhooks/process-participant'
import { logWebhook, updateWebhookLog, getClientIP, extractHeaders } from '@/lib/webhooks/logger'

export async function POST(request: Request) {
  const supabase = getWebhookSupabase()
  const startTime = Date.now()
  let logId: string | null = null

  try {
    // Extract event_id from query parameters
    const url = new URL(request.url)
    const eventId = url.searchParams.get('event_id')

    const payload = await request.json()

    // Log inicial do webhook
    logId = await logWebhook({
      direcao: 'inbound',
      evento: 'participantes.webhook',
      url: request.url,
      metodo: 'POST',
      requestHeaders: extractHeaders(request),
      requestBody: payload,
      status: 'success',
      ipOrigem: getClientIP(request),
      entidadeTipo: 'participante',
    })

    // Validate event_id if provided
    if (eventId) {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single()

      if (eventError || !eventData) {
        const errorResponse = { error: 'Evento não encontrado. Verifique o event_id na URL.', event_id: eventId }
        if (logId) {
          await updateWebhookLog(logId, {
            responseStatus: 400,
            responseBody: JSON.stringify(errorResponse),
            duracaoMs: Date.now() - startTime,
            status: 'error',
            erroMensagem: 'Evento não encontrado',
          })
        }
        return NextResponse.json(errorResponse, { status: 400 })
      }
    }

    // Process webhook using shared module
    const result = await processParticipantWebhook(supabase, payload, { eventId })

    const statusCode = result.action === 'created' ? 201 : 200
    const successResponse = {
      success: true,
      action: result.action,
      participantId: result.participantId,
      name: result.name,
      fieldsExtracted: result.fieldsExtracted,
    }

    if (logId) {
      await updateWebhookLog(logId, {
        responseStatus: statusCode,
        responseBody: JSON.stringify(successResponse),
        duracaoMs: Date.now() - startTime,
        status: 'success',
        entidadeId: result.participantId,
      })
    }

    return NextResponse.json(successResponse, { status: statusCode })
  } catch (error: any) {
    console.error('Webhook error:', error)

    const isValidation = error instanceof WebhookValidationError
    const statusCode = isValidation ? 400 : 500
    const errorResponse = isValidation
      ? { error: error.message, ...error.details }
      : { error: error.message || 'Internal server error' }

    if (logId) {
      await updateWebhookLog(logId, {
        responseStatus: statusCode,
        responseBody: JSON.stringify(errorResponse),
        duracaoMs: Date.now() - startTime,
        status: 'error',
        erroMensagem: error.message || 'Internal server error',
      })
    }

    return NextResponse.json(errorResponse, { status: statusCode })
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
