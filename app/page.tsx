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

  // Redirect to event selection page
  // The eventos page will handle checking for active event in localStorage
  // and redirecting to the appropriate dashboard
  redirect('/eventos')

  return null
}
