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

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userDataRes } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const userData = userDataRes as User | null

  if (!userData) {
    redirect('/login')
  }

  return <DashboardLayout user={userData}>{children}</DashboardLayout>
}
