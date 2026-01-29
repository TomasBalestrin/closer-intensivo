'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Sem conexão
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Você está offline. Verifique sua conexão com a internet e tente novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
