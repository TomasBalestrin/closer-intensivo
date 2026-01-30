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
  role: 'admin' | 'closer'
}

const adminNavItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Participantes', href: '/admin/participantes', icon: Users },
  { name: 'Closers', href: '/admin/closers', icon: Trophy },
  { name: 'Relatórios', href: '/admin/relatorios', icon: BarChart3 },
  { name: 'Painel', href: '/admin/painel-admin', icon: Settings },
]

const closerNavItems = [
  { name: 'Dashboard', href: '/closer/dashboard', icon: LayoutDashboard },
  { name: 'Participantes', href: '/closer/participantes', icon: Users },
  { name: 'Meu Painel', href: '/closer/meu-painel', icon: UserCircle },
]

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const navigation = role === 'admin' ? adminNavItems : closerNavItems

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-30',
        'bg-white/80 backdrop-blur-lg border-t border-gray-200',
        'pb-[env(safe-area-inset-bottom)]'
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'transition-colors duration-200 ease-in-out',
                isActive
                  ? 'text-amber-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  isActive ? 'font-semibold' : 'font-medium'
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
