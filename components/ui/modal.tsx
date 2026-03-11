'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  fullScreenMobile?: boolean
}

export function Modal({ isOpen, onClose, title, children, className, fullScreenMobile = true }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        className={cn(
          'relative z-50 w-full bg-white shadow-xl overflow-auto',
          // Mobile: full screen by default
          fullScreenMobile
            ? 'h-full max-h-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:max-w-lg'
            : 'max-h-[90vh] rounded-xl max-w-lg mx-4',
          className
        )}
      >
        {/* Mobile swipe indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className={cn(
          "flex items-center justify-between border-b sticky top-0 bg-white z-10",
          fullScreenMobile ? "p-4 pt-2 sm:pt-4" : "p-4"
        )}>
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className={cn(
          "pb-safe",
          fullScreenMobile ? "p-4 pb-6" : "p-4"
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}
