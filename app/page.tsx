import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Auth error, redirect to login
  }

  if (!user) {
    redirect('/login')
  }

  // Get user role
  let role = 'closer'
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role) {
      role = userData.role
    }
  } catch {
    // Database query failed, use default role
  }

  if (role === 'admin') {
    redirect('/admin/dashboard')
  } else {
    redirect('/closer/dashboard')
  }

  return null
}
