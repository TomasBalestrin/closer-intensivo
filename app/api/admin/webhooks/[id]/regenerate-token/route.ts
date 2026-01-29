import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateToken } from '@/lib/webhooks/signature'

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

  const newToken = generateToken()

  const { data, error } = await supabase
    .from('webhooks')
    .update({ token: newToken, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
