'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, X, RefreshCw } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    // Check if already dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) {
        return
      }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Service Worker update detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShowUpdate(true)
              }
            })
          }
        })
      })
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstall(false)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismissInstall = useCallback(() => {
    setShowInstall(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }, [])

  const handleUpdate = useCallback(() => {
    setShowUpdate(false)
    window.location.reload()
  }, [])

  if (!showInstall && !showUpdate) return null

  return (
    <>
      {/* Install Prompt */}
      {showInstall && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up sm:left-auto sm:right-4 sm:max-w-sm">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Instalar Bethel Events</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Acesse mais rápido direto da tela inicial
                </p>
              </div>
              <button
                onClick={handleDismissInstall}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDismissInstall}
                className="flex-1 text-sm py-2 px-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Agora não
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 text-sm py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                Instalar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Available */}
      {showUpdate && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-up sm:left-auto sm:right-4 sm:max-w-sm">
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Atualização disponível</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Uma nova versão está disponível
                </p>
              </div>
              <button
                onClick={handleUpdate}
                className="flex-shrink-0 text-sm py-1.5 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
