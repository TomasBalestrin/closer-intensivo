'use client'

import Link from 'next/link'
import { Users, UserCircle, LayoutDashboard } from 'lucide-react'

const actions = [
  {
    label: 'Meus Participantes',
    href: '/closer/participantes',
    icon: Users,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Meu Painel',
    href: '/closer/meu-painel',
    icon: UserCircle,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    label: 'Dashboard',
    href: '/closer/dashboard',
    icon: LayoutDashboard,
    color: 'bg-amber-50 text-amber-600',
  },
]

export default function QuickActions() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Acesso Rápido</h2>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow active:scale-95 transition-transform"
          >
            <div className={`p-3 rounded-full ${action.color}`}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
