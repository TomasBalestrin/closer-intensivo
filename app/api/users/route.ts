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

async function verifyAdmin(): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { isAdmin: false, error: 'Não autenticado' }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return { isAdmin: false, error: 'Acesso negado. Apenas administradores podem criar usuários.' }
    }

    return { isAdmin: true, userId: user.id }
  } catch {
    return { isAdmin: false, error: 'Erro ao verificar autenticação' }
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin()
    if (!auth.isAdmin) {
      return NextResponse.json({ message: auth.error }, { status: 403 })
    }

    const { name, email, password, role, event_id } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json(
          { message: 'Este email já está cadastrado' },
          { status: 400 }
        )
      }
      throw authError
    }

    if (!authData.user) {
      throw new Error('Falha ao criar usuário')
    }

    // Create user in users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        name,
        email,
        role: role || 'closer',
      })

    if (userError) throw userError

    // If event_id is provided, create user_events association
    if (event_id) {
      await supabaseAdmin
        .from('user_events')
        .insert({
          user_id: authData.user.id,
          event_id,
          role: role || 'closer',
        })
    }

    return NextResponse.json({
      message: 'Usuário criado com sucesso',
      user: {
        id: authData.user.id,
        name,
        email,
        role,
      },
    })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { message: error.message || 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (!auth.isAdmin) {
      return NextResponse.json({ message: auth.error }, { status: 403 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, photo_url, created_at')
      .order('name')

    if (error) throw error

    return NextResponse.json({ users })
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}
