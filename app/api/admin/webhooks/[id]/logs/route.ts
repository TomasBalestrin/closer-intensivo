import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const perPage = parseInt(url.searchParams.get('per_page') || '20')
  const status = url.searchParams.get('status')
  const periodo = url.searchParams.get('periodo')

  let query = supabase
    .from('webhook_logs')
    .select('*', { count: 'exact' })
    .eq('webhook_id', params.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (periodo) {
    const now = new Date()
    if (periodo === 'today') {
      query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
    } else if (periodo === 'week') {
      query = query.gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    } else if (periodo === 'month') {
      query = query.gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
    }
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    logs: data,
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count || 0) / perPage),
  })
}
