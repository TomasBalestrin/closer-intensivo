import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  // Get current status
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('ativo')
    .eq('id', params.id)
    .single()

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('webhooks')
    .update({ ativo: !webhook.ativo, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
