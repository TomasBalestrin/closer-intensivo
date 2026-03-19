'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Sidebar } from './sidebar'
import { ToastProvider } from '@/components/ui'
import { EventProvider } from '@/lib/hooks/use-event'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/lib/types'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'bethel_active_event_id'

const BottomNav = dynamic(
  () => import('./bottom-nav').then(mod => ({ default: mod.BottomNav })),
  { ssr: false }
)

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter()
  const supabase = createClient()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleLogout = async () => {
    localStorage.removeItem(STORAGE_KEY)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleExitEvent = () => {
    localStorage.removeItem(STORAGE_KEY)
    router.push('/eventos')
  }

  return (
    <EventProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar
            user={user}
            onLogout={handleLogout}
            onExitEvent={handleExitEvent}
            onCollapseChange={setSidebarCollapsed}
          />
          <main className={cn(
            'flex-1 overflow-x-hidden transition-all duration-300',
            sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
          )}>
            <div className="p-4 lg:p-8 pt-16 lg:pt-8 pb-20 lg:pb-8">{children}</div>
          </main>
          <BottomNav role={user.role as 'admin' | 'closer' | 'financeiro'} />
        </div>
      </ToastProvider>
    </EventProvider>
  )
}
