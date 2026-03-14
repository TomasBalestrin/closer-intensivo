import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET /api/admin/webhooks/logs - Lista todos os logs recentes
export async function GET(request: Request) {
  const supabase = getSupabase()
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const perPage = parseInt(url.searchParams.get('per_page') || '50')
  const status = url.searchParams.get('status')
  const direcao = url.searchParams.get('direcao')
  const periodo = url.searchParams.get('periodo') || 'week'
  const eventId = url.searchParams.get('event_id')

  let query = supabase
    .from('webhook_logs')
    .select('*, webhooks(nome, tipo, categoria)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (direcao && direcao !== 'all') {
    query = query.eq('direcao', direcao)
  }

  // Filtro por período
  const now = new Date()
  if (periodo === 'today') {
    query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
  } else if (periodo === 'week') {
    query = query.gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
  } else if (periodo === 'month') {
    query = query.gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Estatísticas rápidas
  const stats = {
    total: count || 0,
    success: data?.filter(l => l.status === 'success').length || 0,
    error: data?.filter(l => l.status === 'error').length || 0,
    timeout: data?.filter(l => l.status === 'timeout').length || 0,
  }

  return NextResponse.json({
    logs: data,
    stats,
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count || 0) / perPage),
  })
}
