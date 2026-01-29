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

async function verifyAdmin(): Promise<{ authorized: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { authorized: false, error: 'Não autenticado' }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') return { authorized: false, error: 'Acesso negado: apenas administradores' }
    return { authorized: true }
  } catch {
    return { authorized: false, error: 'Erro ao verificar autenticação' }
  }
}

export async function POST(request: Request) {
  try {
    // Verify the caller is an authenticated admin
    const auth = await verifyAdmin()
    if (!auth.authorized) {
      return NextResponse.json({ message: auth.error }, { status: 403 })
    }

    const { userId, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json(
        { message: 'User ID e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    })

    if (error) {
      console.error('Update password error:', error)
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update password error:', error)
    return NextResponse.json(
      { message: error.message || 'Erro ao atualizar senha' },
      { status: 500 }
    )
  }
}
