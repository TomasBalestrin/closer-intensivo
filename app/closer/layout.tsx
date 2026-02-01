import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/shared'
import { User } from '@/lib/types'

export default async function CloserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  let authUser = null
  try {
    const { data } = await supabase.auth.getUser()
    authUser = data.user
  } catch {
    redirect('/login')
  }

  if (!authUser) {
    redirect('/login')
  }

  let userData: User | null = null
  try {
    const { data: userDataRes } = await supabase
      .from('users')
      .select('id, name, email, role, photo_url')
      .eq('id', authUser.id)
      .single()

    userData = userDataRes as User | null
  } catch {
    // User not found in database, redirect to login
    redirect('/login')
  }

  if (!userData) {
    redirect('/login')
  }

  return <DashboardLayout user={userData}>{children}</DashboardLayout>
}
