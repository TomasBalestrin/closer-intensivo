'use client'

import { cn } from '@/lib/utils'
import {
  Users,
  UserCheck,
  Target,
  DollarSign,
  TrendingUp,
} from 'lucide-react'

const iconMap = {
  Users,
  UserCheck,
  Target,
  DollarSign,
  TrendingUp,
}

export type IconName = keyof typeof iconMap

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: IconName
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  bgColor?: string
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  bgColor = 'bg-white',
}: StatsCardProps) {
  const Icon = icon ? iconMap[icon] : null

  return (
    <div className={cn('rounded-lg shadow-md p-6', bgColor, className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-sm mt-1',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-50 rounded-full">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  )
}
