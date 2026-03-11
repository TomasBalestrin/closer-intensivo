'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function BottomSheet({ isOpen, onClose, title, children, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - startY.current

    if (deltaY > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`
    }
  }

  const handleTouchEnd = () => {
    const deltaY = currentY.current - startY.current

    if (deltaY > 100) {
      onClose()
    }

    if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-white rounded-t-2xl shadow-2xl',
          'max-h-[85vh] overflow-auto',
          'pb-[env(safe-area-inset-bottom)]',
          'animate-slide-up',
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="sticky top-0 bg-white pt-3 pb-2 flex justify-center rounded-t-2xl">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ActionSheetItemProps {
  icon?: React.ReactNode
  label: string
  description?: string
  onClick: () => void
  variant?: 'default' | 'danger'
  className?: string
}

export function ActionSheetItem({
  icon,
  label,
  description,
  onClick,
  variant = 'default',
  className
}: ActionSheetItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 w-full p-4 min-h-[56px]',
        'text-left rounded-xl',
        'transition-colors duration-150',
        'active:bg-gray-100',
        variant === 'danger' ? 'text-red-600' : 'text-gray-900',
        className
      )}
    >
      {icon && (
        <span className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          variant === 'danger' ? 'bg-red-100' : 'bg-gray-100'
        )}>
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{label}</div>
        {description && (
          <div className={cn(
            'text-sm mt-0.5',
            variant === 'danger' ? 'text-red-500' : 'text-gray-500'
          )}>
            {description}
          </div>
        )}
      </div>
    </button>
  )
}
