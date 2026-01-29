import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/webhooks/encryption'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()

  const { data: webhook } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })
  }

  const body = await request.json()
  const testPayload = body.payload || {
    event: 'test',
    timestamp: new Date().toISOString(),
    webhook_id: webhook.id,
    data: {
      id: 'test-uuid-123',
      nome: 'Participante Teste',
      email: 'teste@email.com',
    },
    metadata: {
      source: 'bethel-events',
      version: '1.0',
      environment: 'test',
    },
  }

  if (webhook.tipo === 'outbound' && webhook.url) {
    const inicio = Date.now()

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(webhook.custom_headers || {}),
      }

      if (webhook.auth_type === 'bearer' && webhook.auth_value_encrypted) {
        headers['Authorization'] = `Bearer ${decrypt(webhook.auth_value_encrypted)}`
      } else if (webhook.auth_type === 'api_key' && webhook.auth_value_encrypted) {
        headers['X-API-Key'] = decrypt(webhook.auth_value_encrypted)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), (webhook.timeout_seconds || 30) * 1000)

      const response = await fetch(webhook.url, {
        method: webhook.metodo || 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const duracao = Date.now() - inicio
      let responseBody = ''
      try {
        responseBody = await response.text()
      } catch {}

      // Log test
      await supabase.from('webhook_logs').insert({
        webhook_id: webhook.id,
        direcao: 'outbound',
        evento: 'test',
        url: webhook.url,
        metodo: webhook.metodo,
        request_body: testPayload,
        response_status: response.status,
        response_body: responseBody.substring(0, 5000),
        duracao_ms: duracao,
        status: response.ok ? 'success' : 'error',
        erro_mensagem: response.ok ? null : `HTTP ${response.status}`,
      })

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        duracao_ms: duracao,
        response_body: responseBody.substring(0, 2000),
      })
    } catch (error: any) {
      const duracao = Date.now() - inicio
      const isTimeout = error.name === 'AbortError'

      return NextResponse.json({
        success: false,
        status: isTimeout ? 408 : 0,
        statusText: isTimeout ? 'Timeout' : 'Connection Error',
        duracao_ms: duracao,
        error: isTimeout ? 'Timeout - webhook não respondeu a tempo' : error.message,
      })
    }
  }

  // Inbound test - just return the URL info
  return NextResponse.json({
    success: true,
    tipo: 'inbound',
    url: webhook.token
      ? `/api/webhooks/${webhook.categoria}/${webhook.token}`
      : null,
    message: 'Webhook inbound - envie um POST para a URL acima para testar',
  })
}
