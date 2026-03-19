'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { FileDown, CheckCircle, AlertCircle } from 'lucide-react'
import { Participant } from '@/lib/types/database'
import { generatePdfReport } from './pdf-report-generator'

interface PdfReportModalProps {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  eventName: string
}

type DayFilter = 'all' | 'day1' | 'day2' | 'day3'
type Status = 'idle' | 'generating' | 'success' | 'error'

const DAY_OPTIONS: { value: DayFilter; label: string }[] = [
  { value: 'all', label: 'Todos os participantes' },
  { value: 'day1', label: 'Credenciamento Dia 1' },
  { value: 'day2', label: 'Credenciamento Dia 2' },
  { value: 'day3', label: 'Credenciamento Dia 3' },
]

export function PdfReportModal({ isOpen, onClose, participants, eventName }: PdfReportModalProps) {
  const [dayFilter, setDayFilter] = useState<DayFilter>('all')
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ step: '', current: 0, total: 0 })
  const [errorMsg, setErrorMsg] = useState('')

  const handleGenerate = async () => {
    setStatus('generating')
    setErrorMsg('')

    try {
      await generatePdfReport({
        participants,
        dayFilter,
        eventName,
        onProgress: (step, current, total) => {
          setProgress({ step, current, total })
        },
      })
      setStatus('success')
    } catch (e: any) {
      console.error('PDF generation failed:', e)
      setErrorMsg(e.message || 'Erro ao gerar relatório')
      setStatus('error')
    }
  }

  const handleClose = () => {
    if (status !== 'generating') {
      setStatus('idle')
      setProgress({ step: '', current: 0, total: 0 })
      setErrorMsg('')
      onClose()
    }
  }

  const progressPct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Gerar Relatório PDF" fullScreenMobile={false}>
      <div className="space-y-5">
        {status === 'idle' && (
          <>
            <p className="text-sm text-gray-600">
              Gera um relatório PDF com a distribuição de qualificação, nichos, respostas agrupadas por IA
              e análise estratégica para posicionamento do Elite Premium.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Filtrar por credenciamento
              </label>
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value as DayFilter)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              >
                {DAY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                A geração pode levar de 15 a 30 segundos pois utiliza IA para agrupar respostas
                e criar a análise estratégica.
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </>
        )}

        {status === 'generating' && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-sm font-medium text-gray-700">{progress.step}</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <p className="text-xs text-gray-500 text-center">
              {progress.current} de {progress.total} etapas
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Relatório gerado com sucesso!</p>
            <p className="text-xs text-gray-500">O download deve iniciar automaticamente.</p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={handleClose}
                className="flex-1"
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setStatus('idle')
                  setProgress({ step: '', current: 0, total: 0 })
                }}
                className="flex-1"
              >
                Gerar outro
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Erro ao gerar relatório</p>
            <p className="text-xs text-red-600">{errorMsg}</p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={handleClose}
                className="flex-1"
              >
                Fechar
              </Button>
              <Button
                onClick={handleGenerate}
                className="flex-1"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
