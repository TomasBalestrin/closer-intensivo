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

    const { name, email, password, role, photo_url } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { message: authError.message },
        { status: 400 }
      )
    }

    // The trigger should create the user in public.users table
    // But let's update the photo_url and ensure the role is correct
    if (authData.user) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          name,
          role,
          photo_url: photo_url || null,
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        // If update fails, the user was created without photo, which is acceptable
      }
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { message: error.message || 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}
