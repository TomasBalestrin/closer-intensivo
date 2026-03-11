'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Settings,
  Trophy,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  role: 'admin' | 'closer' | 'financeiro'
}

const adminNavItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Participantes', href: '/admin/participantes', icon: Users },
  { name: 'Closers', href: '/admin/closers', icon: Trophy },
  { name: 'Relatórios', href: '/admin/relatorios', icon: BarChart3 },
  { name: 'Painel', href: '/admin/painel-admin', icon: Settings },
]

const financeiroNavItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Closers', href: '/admin/closers', icon: Trophy },
  { name: 'Relatórios', href: '/admin/relatorios', icon: BarChart3 },
]

const closerNavItems = [
  { name: 'Dashboard', href: '/closer/dashboard', icon: LayoutDashboard },
  { name: 'Participantes', href: '/closer/participantes', icon: Users },
  { name: 'Meu Painel', href: '/closer/meu-painel', icon: UserCircle },
]

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const navigation = role === 'admin' ? adminNavItems : role === 'financeiro' ? financeiroNavItems : closerNavItems

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-30',
        'bg-white/95 backdrop-blur-xl border-t border-gray-200/80',
        'pb-[env(safe-area-inset-bottom)]',
        'shadow-[0_-4px_20px_rgba(0,0,0,0.08)]'
      )}
    >
      <div className="flex items-center justify-around h-[60px] px-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[64px]',
                'transition-all duration-200 ease-out touch-manipulation',
                'active:scale-95 active:opacity-80',
                isActive
                  ? 'text-amber-600'
                  : 'text-gray-400'
              )}
            >
              <div className={cn(
                'relative flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200',
                isActive && 'bg-amber-100'
              )}>
                <item.icon
                  className={cn(
                    'h-[22px] w-[22px] transition-all duration-200',
                    isActive && 'scale-105'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={cn(
                  'text-[11px] leading-none tracking-tight',
                  isActive ? 'font-bold' : 'font-medium'
                )}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
