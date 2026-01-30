'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { ToastProvider } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/lib/types'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex-1 lg:pl-0">
          <div className="p-4 lg:p-8 pt-16 lg:pt-8 pb-20 lg:pb-8">{children}</div>
        </main>
        <BottomNav role={user.role as 'admin' | 'closer'} />
      </div>
    </ToastProvider>
  )
}
