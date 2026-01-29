import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateToken } from '@/lib/webhooks/signature'
import { encrypt } from '@/lib/webhooks/encryption'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET /api/admin/webhooks - List all webhooks
export async function GET() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/admin/webhooks - Create new webhook
export async function POST(request: Request) {
  const supabase = getSupabase()

  try {
    const body = await request.json()

    const webhookData: Record<string, any> = {
      nome: body.nome,
      descricao: body.descricao || null,
      tipo: body.tipo,
      categoria: body.categoria || null,
      ativo: body.ativo !== false,
    }

    // Inbound-specific
    if (body.tipo === 'inbound') {
      webhookData.token = generateToken()
      webhookData.secret_key = body.secret_key || null
    }

    // Outbound-specific
    if (body.tipo === 'outbound') {
      webhookData.url = body.url
      webhookData.metodo = body.metodo || 'POST'
      webhookData.eventos = body.eventos || []
      webhookData.auth_type = body.auth_type || 'none'
      if (body.auth_value) {
        webhookData.auth_value_encrypted = encrypt(body.auth_value)
      }
      webhookData.custom_headers = body.custom_headers || {}
      webhookData.retry_attempts = body.retry_attempts || 3
      webhookData.retry_delay_seconds = body.retry_delay_seconds || 30
      webhookData.timeout_seconds = body.timeout_seconds || 30
      webhookData.filtros = body.filtros || []
    }

    const { data, error } = await supabase
      .from('webhooks')
      .insert(webhookData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
