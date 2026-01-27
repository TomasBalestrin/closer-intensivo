import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: Request) {
  try {
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
