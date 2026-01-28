'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Flame,
  Webhook,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, Badge } from '@/components/ui'
import { User } from '@/lib/types'

interface SidebarProps {
  user: User
  onLogout: () => void
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isAdmin = user.role === 'admin'

  const navigation = isAdmin
    ? [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Participantes', href: '/admin/participantes', icon: Users },
        { name: 'Closers', href: '/admin/closers', icon: Trophy },
        { name: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
        { name: 'Painel Admin', href: '/admin/painel-admin', icon: Settings },
      ]
    : [
        { name: 'Dashboard', href: '/closer/dashboard', icon: LayoutDashboard },
        { name: 'Participantes', href: '/closer/participantes', icon: Users },
        { name: 'Meu Painel', href: '/closer/meu-painel', icon: UserCircle },
      ]

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 sidebar transform transition-all duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-white">Bethel Events</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center mx-auto">
                <Flame className="h-5 w-5 text-white" />
              </div>
            )}
            <button
              className={cn(
                'hidden lg:flex h-8 w-8 rounded-lg items-center justify-center text-white/70 hover:bg-white/10 transition-colors',
                isCollapsed && 'mx-auto'
              )}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'sidebar-item',
                    isActive ? 'sidebar-item-active' : 'sidebar-item-inactive',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-white/10 p-2">
            {user && (
              <div
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg',
                  isCollapsed ? 'justify-center' : ''
                )}
              >
                {user.photo_url ? (
                  <Avatar src={user.photo_url} alt={user.name} size="md" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-500 text-xs font-semibold">
                      {getInitials(user.name)}
                    </span>
                  </div>
                )}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name}
                    </p>
                    <Badge
                      variant={isAdmin ? 'info' : 'success'}
                      className="text-xs mt-0.5"
                    >
                      {isAdmin ? 'Admin' : 'Closer'}
                    </Badge>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onLogout}
              className={cn(
                'w-full mt-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-white/70 hover:bg-white/10 hover:text-red-400 transition-colors',
                isCollapsed && 'justify-center px-0'
              )}
              title={isCollapsed ? 'Sair' : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
