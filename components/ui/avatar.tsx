'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, alt, size = 'md', className }: AvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  const initials = alt
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Show initials if no src, empty src, or image failed to load
  if (!src || imageError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-blue-600 text-white font-medium',
          sizes[size],
          className
        )}
      >
        <span className={cn(size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base')}>
          {initials}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('relative rounded-full overflow-hidden', sizes[size], className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
        unoptimized
      />
    </div>
  )
}
