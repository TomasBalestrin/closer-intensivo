import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function getColorClass(color: string | null): string {
  const colorMap: Record<string, string> = {
    rosa: 'bg-badge-rosa text-white',
    preto: 'bg-badge-preto text-white',
    azul_claro: 'bg-badge-azul-claro text-white',
    dourado: 'bg-badge-dourado text-black',
    laranja: 'bg-badge-laranja text-white',
    verde: 'bg-green-600 text-white',
  }
  return color ? colorMap[color] || 'bg-gray-200 text-gray-800' : 'bg-gray-200 text-gray-800'
}

export function getQualificationClass(qualification: string | null): string {
  const qualMap: Record<string, string> = {
    super: 'bg-qual-super',
    medio: 'bg-qual-medio',
    baixo: 'bg-qual-baixo',
  }
  return qualification ? qualMap[qualification] || '' : ''
}

export function generateFormUrl(formId: string): string {
  return `/form/${formId}`
}

export function getInstagramUrl(handle: string | null): string | null {
  if (!handle) return null
  const cleanHandle = handle.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')
  return `https://instagram.com/${cleanHandle}`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// CSV Export utilities
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; label: string; format?: (value: any, row: T) => string }[],
  filename: string
): void {
  if (data.length === 0) return

  // Create header row
  const header = columns.map(col => `"${col.label}"`).join(',')

  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const keys = (col.key as string).split('.')
      let value: any = row
      for (const key of keys) {
        value = value?.[key]
      }

      if (col.format) {
        value = col.format(value, row)
      }

      // Escape quotes and wrap in quotes
      if (value === null || value === undefined) {
        return '""'
      }
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  }).join('\n')

  const csv = `${header}\n${rows}`

  // Create and trigger download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function formatDateBR(date: string | Date | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR')
}

export function formatBoolean(value: boolean | null): string {
  return value ? 'Sim' : 'Não'
}
