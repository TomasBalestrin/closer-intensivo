import { createClient } from '@supabase/supabase-js'
import { decrypt } from './encryption'
import type { WebhookEvent, WebhookFiltro } from './types'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

function passaFiltros(filtros: WebhookFiltro[] | null, dados: any): boolean {
  if (!filtros || filtros.length === 0) return true

  return filtros.every(filtro => {
    const valor = dados?.[filtro.campo]
    switch (filtro.operador) {
      case 'equals':
        return valor === filtro.valor
      case 'contains':
        return String(valor || '').includes(String(filtro.valor))
      case 'greater_than':
        return Number(valor) > Number(filtro.valor)
      case 'less_than':
        return Number(valor) < Number(filtro.valor)
      default:
        return true
    }
  })
}

export async function dispararWebhooks(event: WebhookEvent) {
  const supabase = getSupabase()

  // Find active outbound webhooks listening to this event
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('tipo', 'outbound')
    .eq('ativo', true)
    .contains('eventos', [event.evento])

  if (!webhooks || webhooks.length === 0) return

  for (const webhook of webhooks) {
    // Check filters
    if (!passaFiltros(webhook.filtros, event.dados)) continue

    await supabase.from('webhook_queue').insert({
      webhook_id: webhook.id,
      evento: event.evento,
      payload: {
        event: event.evento,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id,
        data: event.dados,
        metadata: {
          source: 'bethel-events',
          version: '1.0',
          environment: process.env.NODE_ENV || 'production',
        },
      },
      max_tentativas: webhook.retry_attempts,
    })
  }
}

export async function processarFilaWebhooks(): Promise<{ processed: number; errors: number }> {
  const supabase = getSupabase()
  let processed = 0
  let errors = 0

  // Fetch pending items whose retry time has passed
  const { data: itens } = await supabase
    .from('webhook_queue')
    .select('*, webhook:webhooks(*)')
    .eq('status', 'pending')
    .lte('proxima_tentativa', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(10)

  for (const item of itens || []) {
    const result = await processarItemFila(item, supabase)
    if (result) processed++
    else errors++
  }

  return { processed, errors }
}

async function processarItemFila(item: any, supabase: any): Promise<boolean> {
  const webhook = item.webhook
  if (!webhook) return false

  // Mark as processing
  await supabase
    .from('webhook_queue')
    .update({ status: 'processing' })
    .eq('id', item.id)

  const inicio = Date.now()

  try {
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(webhook.custom_headers || {}),
    }

    // Add authentication
    if (webhook.auth_type === 'bearer' && webhook.auth_value_encrypted) {
      headers['Authorization'] = `Bearer ${decrypt(webhook.auth_value_encrypted)}`
    } else if (webhook.auth_type === 'api_key' && webhook.auth_value_encrypted) {
      headers['X-API-Key'] = decrypt(webhook.auth_value_encrypted)
    } else if (webhook.auth_type === 'basic' && webhook.auth_value_encrypted) {
      headers['Authorization'] = `Basic ${decrypt(webhook.auth_value_encrypted)}`
    }

    // Send request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), (webhook.timeout_seconds || 30) * 1000)

    const response = await fetch(webhook.url, {
      method: webhook.metodo || 'POST',
      headers,
      body: JSON.stringify(item.payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const duracao = Date.now() - inicio
    let responseBody = ''
    try {
      responseBody = await response.text()
    } catch {}

    // Log result
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      direcao: 'outbound',
      evento: item.evento,
      url: webhook.url,
      metodo: webhook.metodo,
      request_body: item.payload,
      response_status: response.status,
      response_body: responseBody.substring(0, 5000),
      duracao_ms: duracao,
      tentativa: item.tentativas + 1,
      status: response.ok ? 'success' : 'error',
      erro_mensagem: response.ok ? null : `HTTP ${response.status}`,
    })

    if (response.ok) {
      // Success - mark as completed
      await supabase
        .from('webhook_queue')
        .update({ status: 'completed', processado_at: new Date().toISOString() })
        .eq('id', item.id)

      // Update stats
      await supabase.rpc('incrementar_webhook_sucesso', { p_webhook_id: webhook.id })
      return true
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error: any) {
    const duracao = Date.now() - inicio
    const novaTentativa = item.tentativas + 1
    const isTimeout = error.name === 'AbortError'

    // Log error
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      direcao: 'outbound',
      evento: item.evento,
      url: webhook.url,
      request_body: item.payload,
      duracao_ms: duracao,
      tentativa: novaTentativa,
      status: isTimeout ? 'timeout' : 'error',
      erro_mensagem: isTimeout ? 'Request timeout' : error.message,
    })

    if (novaTentativa >= (item.max_tentativas || 3)) {
      // Final failure
      await supabase
        .from('webhook_queue')
        .update({
          status: 'failed',
          ultimo_erro: error.message,
          tentativas: novaTentativa,
        })
        .eq('id', item.id)

      await supabase.rpc('incrementar_webhook_falha', { p_webhook_id: webhook.id })
    } else {
      // Schedule retry with exponential backoff
      const proximaTentativa = new Date()
      proximaTentativa.setSeconds(
        proximaTentativa.getSeconds() + (webhook.retry_delay_seconds || 30) * novaTentativa
      )

      await supabase
        .from('webhook_queue')
        .update({
          status: 'pending',
          tentativas: novaTentativa,
          proxima_tentativa: proximaTentativa.toISOString(),
          ultimo_erro: error.message,
        })
        .eq('id', item.id)
    }

    return false
  }
}
