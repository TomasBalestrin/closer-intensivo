'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
}

const THRESHOLD = 60

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return

      const scrollableParent = findScrollableParent(e.target as HTMLElement)
      const scrollTop = scrollableParent
        ? scrollableParent.scrollTop
        : window.scrollY

      if (scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY
        isPulling.current = true
      }
    },
    [isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || isRefreshing) return

      const currentY = e.touches[0].clientY
      const diff = currentY - touchStartY.current

      if (diff > 0) {
        // Apply resistance: the further you pull, the harder it gets
        const dampened = Math.min(diff * 0.5, 120)
        setPullDistance(dampened)
      }
    },
    [isRefreshing]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || isRefreshing) return
    isPulling.current = false

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true)
      setPullDistance(THRESHOLD)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, isRefreshing, onRefresh])

  const pastThreshold = pullDistance >= THRESHOLD

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-0 flex-1"
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 top-0 z-50 flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{
          height: pullDistance > 0 || isRefreshing ? `${pullDistance}px` : '0px',
          transitionDuration: isPulling.current ? '0ms' : '200ms',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {isRefreshing ? (
            <svg
              className="h-6 w-6 animate-spin text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6 text-gray-500 transition-transform duration-200"
              style={{
                transform: pastThreshold ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
              />
            </svg>
          )}
          {!isRefreshing && (
            <span className="text-xs text-gray-500">
              {pastThreshold ? 'Solte para atualizar' : 'Puxe para atualizar'}
            </span>
          )}
        </div>
      </div>

      {/* Children wrapper */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform:
            pullDistance > 0 || isRefreshing
              ? `translateY(${pullDistance}px)`
              : 'translateY(0)',
          transitionDuration: isPulling.current ? '0ms' : '200ms',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Walk up the DOM tree to find the nearest scrollable ancestor.
 * Returns null if none found (will fall back to window.scrollY).
 */
function findScrollableParent(el: HTMLElement | null): HTMLElement | null {
  while (el && el !== document.body) {
    const { overflowY } = getComputedStyle(el)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      return el
    }
    el = el.parentElement
  }
  return null
}
