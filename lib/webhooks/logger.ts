import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface WebhookLogData {
  webhookId?: string
  direcao: 'inbound' | 'outbound'
  evento: string
  url: string
  metodo: string
  requestHeaders?: Record<string, any>
  requestBody: any
  responseStatus?: number
  responseHeaders?: Record<string, any>
  responseBody?: string
  duracaoMs?: number
  tentativa?: number
  status: 'success' | 'error' | 'timeout' | 'retry'
  erroMensagem?: string
  entidadeTipo?: string
  entidadeId?: string
  ipOrigem?: string
}

export async function logWebhook(data: WebhookLogData): Promise<string | null> {
  const supabase = getSupabase()

  try {
    // Truncar bodies se forem muito grandes (max 10KB)
    const maxBodySize = 10000
    let requestBody = data.requestBody
    let responseBody = data.responseBody

    if (typeof requestBody === 'object') {
      const stringified = JSON.stringify(requestBody)
      if (stringified.length > maxBodySize) {
        requestBody = {
          _truncated: true,
          _originalSize: stringified.length,
          _preview: stringified.substring(0, maxBodySize) + '...',
        }
      }
    }

    if (responseBody && responseBody.length > maxBodySize) {
      responseBody = responseBody.substring(0, maxBodySize) + '... [truncado]'
    }

    const { data: log, error } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_id: data.webhookId || null,
        direcao: data.direcao,
        evento: data.evento,
        url: data.url,
        metodo: data.metodo,
        request_headers: data.requestHeaders || {},
        request_body: requestBody,
        response_status: data.responseStatus || null,
        response_headers: data.responseHeaders || {},
        response_body: responseBody || null,
        duracao_ms: data.duracaoMs || null,
        tentativa: data.tentativa || 1,
        status: data.status,
        erro_mensagem: data.erroMensagem || null,
        entidade_tipo: data.entidadeTipo || null,
        entidade_id: data.entidadeId || null,
        ip_origem: data.ipOrigem || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao logar webhook:', error)
      // Fallback para tabela antiga se nova não existir
      await supabase.from('webhooks_log').insert({
        payload: requestBody,
        processed: false,
      })
      return null
    }

    return log?.id || null
  } catch (error) {
    console.error('Erro crítico ao logar webhook:', error)
    return null
  }
}

export async function updateWebhookLog(
  logId: string,
  data: Partial<{
    responseStatus: number
    responseBody: string
    responseHeaders: Record<string, any>
    duracaoMs: number
    status: 'success' | 'error' | 'timeout'
    erroMensagem: string
    entidadeId: string
  }>
): Promise<void> {
  const supabase = getSupabase()

  try {
    const updateData: Record<string, any> = {}
    if (data.responseStatus !== undefined) updateData.response_status = data.responseStatus
    if (data.responseBody !== undefined) {
      updateData.response_body = data.responseBody.length > 10000
        ? data.responseBody.substring(0, 10000) + '... [truncado]'
        : data.responseBody
    }
    if (data.responseHeaders !== undefined) updateData.response_headers = data.responseHeaders
    if (data.duracaoMs !== undefined) updateData.duracao_ms = data.duracaoMs
    if (data.status !== undefined) updateData.status = data.status
    if (data.erroMensagem !== undefined) updateData.erro_mensagem = data.erroMensagem
    if (data.entidadeId !== undefined) updateData.entidade_id = data.entidadeId

    await supabase
      .from('webhook_logs')
      .update(updateData)
      .eq('id', logId)
  } catch (error) {
    console.error('Erro ao atualizar log webhook:', error)
  }
}

// Helper para extrair IP do request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return 'unknown'
}

// Helper para extrair headers relevantes
export function extractHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {}
  const relevantHeaders = [
    'content-type',
    'user-agent',
    'x-forwarded-for',
    'x-real-ip',
    'origin',
    'referer',
    'authorization',
    'x-webhook-signature',
  ]

  for (const header of relevantHeaders) {
    const value = request.headers.get(header)
    if (value) {
      // Mascarar authorization
      if (header === 'authorization') {
        headers[header] = value.substring(0, 20) + '...'
      } else {
        headers[header] = value
      }
    }
  }

  return headers
}
