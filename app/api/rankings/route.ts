import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function verifyAuthenticated(): Promise<{ authenticated: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { authenticated: false, error: 'Não autenticado' }
    return { authenticated: true }
  } catch {
    return { authenticated: false, error: 'Erro ao verificar autenticação' }
  }
}

export async function GET() {
  try {
    const auth = await verifyAuthenticated()
    if (!auth.authenticated) {
      return NextResponse.json({ message: auth.error }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const [closersRes, salesRes] = await Promise.all([
      supabaseAdmin.from('users').select('id, name, photo_url').eq('role', 'closer'),
      supabaseAdmin.from('sales').select('closer_id, total_value, entry_value'),
    ])

    const allClosers = closersRes.data || []
    const allSales = salesRes.data || []

    const rankings = allClosers.map(closer => {
      const closerSales = allSales.filter(s => s.closer_id === closer.id)
      return {
        id: closer.id,
        name: closer.name,
        photo_url: closer.photo_url,
        salesCount: closerSales.length,
        totalValue: closerSales.reduce((sum, s) => sum + Number(s.total_value || 0), 0),
        entryValue: closerSales.reduce((sum, s) => sum + Number(s.entry_value || 0), 0),
      }
    }).sort((a, b) => b.totalValue - a.totalValue)

    return NextResponse.json({ rankings })
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
