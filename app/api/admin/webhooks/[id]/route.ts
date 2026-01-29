import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/webhooks/encryption'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET /api/admin/webhooks/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PUT /api/admin/webhooks/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()

  try {
    const body = await request.json()

    const updateData: Record<string, any> = {
      nome: body.nome,
      descricao: body.descricao || null,
      ativo: body.ativo,
      updated_at: new Date().toISOString(),
    }

    if (body.tipo === 'inbound') {
      updateData.categoria = body.categoria
      updateData.secret_key = body.secret_key || null
    }

    if (body.tipo === 'outbound') {
      updateData.url = body.url
      updateData.metodo = body.metodo || 'POST'
      updateData.eventos = body.eventos || []
      updateData.auth_type = body.auth_type || 'none'
      if (body.auth_value) {
        updateData.auth_value_encrypted = encrypt(body.auth_value)
      }
      updateData.custom_headers = body.custom_headers || {}
      updateData.retry_attempts = body.retry_attempts || 3
      updateData.retry_delay_seconds = body.retry_delay_seconds || 30
      updateData.timeout_seconds = body.timeout_seconds || 30
      updateData.filtros = body.filtros || []
    }

    const { data, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/webhooks/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
