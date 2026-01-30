import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/4" />
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-12 bg-gray-100 border-b border-gray-200" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-16 border-b border-gray-200 flex items-center px-4 gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  )
}

export function ParticipantCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 bg-gray-200 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 rounded w-2/5" />
            <div className="h-5 bg-gray-200 rounded-full w-20" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-3/5" />
          <div className="h-5 bg-gray-200 rounded-full w-24 mt-1" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-28" />
        <div className="h-5 bg-gray-200 rounded-full w-16" />
      </div>
    </div>
  )
}

export function ParticipantGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <ParticipantCardSkeleton key={i} />
      ))}
    </div>
  )
}
