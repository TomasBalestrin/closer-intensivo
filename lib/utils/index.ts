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
    rosa: 'bg-pink-500 text-white',
    preto: 'bg-gray-900 text-white',
    azul_claro: 'bg-sky-400 text-white',
    verde: 'bg-green-500 text-white',
    dourado: 'bg-yellow-500 text-black',
    laranja: 'bg-orange-500 text-white',
  }
  return color ? colorMap[color] || 'bg-gray-200 text-gray-800' : 'bg-gray-200 text-gray-800'
}

export function getQualificationClass(qualification: string | null): string {
  const qualMap: Record<string, string> = {
    baixo: 'bg-red-100 text-red-800',
    medio: 'bg-amber-100 text-amber-800',
    alto: 'bg-green-100 text-green-800',
  }
  return qualification ? qualMap[qualification] || '' : ''
}

// Revenue options with color and qualification mapping
export const FATURAMENTO_OPTIONS = [
  { value: 'Até R$ 5.000,00', label: 'Até R$ 5.000,00', color: 'rosa', qualification: 'baixo', max: 5000 },
  { value: 'R$ 5.000,00 até R$ 10.000,00', label: 'R$ 5.000,00 até R$ 10.000,00', color: 'preto', qualification: 'baixo', max: 10000 },
  { value: 'R$ 10.000,00 até R$ 20.000,00', label: 'R$ 10.000,00 até R$ 20.000,00', color: 'azul_claro', qualification: 'medio', max: 20000 },
  { value: 'R$ 20.000,00 até R$ 50.000,00', label: 'R$ 20.000,00 até R$ 50.000,00', color: 'verde', qualification: 'medio', max: 50000 },
  { value: 'R$ 50.000,00 até R$ 100.000,00', label: 'R$ 50.000,00 até R$ 100.000,00', color: 'dourado', qualification: 'alto', max: 100000 },
  { value: 'R$ 100.000,00 até R$ 250.000,00', label: 'R$ 100.000,00 até R$ 250.000,00', color: 'laranja', qualification: 'alto', max: 250000 },
  { value: 'R$ 250.000,00 até R$ 500.000,00', label: 'R$ 250.000,00 até R$ 500.000,00', color: 'laranja', qualification: 'alto', max: 500000 },
  { value: 'Acima de R$ 500.000,00', label: 'Acima de R$ 500.000,00', color: 'laranja', qualification: 'alto', max: Infinity },
]

// Normalize any revenue string to a matching FATURAMENTO_OPTIONS value
// Handles formats like: "R$ 20.000,00 até 50.000,00", "R$ 20.000 a R$ 50.000", etc.
export function normalizeRevenue(revenue: string | null): string {
  if (!revenue) return ''
  // Check if already matches an option exactly
  const exact = FATURAMENTO_OPTIONS.find(opt => opt.value === revenue)
  if (exact) return exact.value
  // Extract numbers from string
  const numbers = revenue.replace(/[R$\s]/g, '').match(/[\d.]+/g)
  if (!numbers || numbers.length === 0) return revenue
  // Parse the max number (second number, or only number)
  const maxNum = numbers.length > 1
    ? parseFloat(numbers[1].replace(/\./g, '').replace(',', '.'))
    : parseFloat(numbers[0].replace(/\./g, '').replace(',', '.'))
  // Handle "Até" / below minimum
  if (revenue.toLowerCase().startsWith('até') || revenue.toLowerCase().startsWith('ate')) {
    return FATURAMENTO_OPTIONS[0].value
  }
  // Handle "Acima de R$ X" - find the range where the number fits as a minimum
  if (revenue.toLowerCase().includes('acima')) {
    const num = parseFloat((numbers[0] || '0').replace(/\./g, '').replace(',', '.'))
    // Find the first range whose max is greater than the extracted number
    const range = FATURAMENTO_OPTIONS.find(opt => num < opt.max && opt.max !== Infinity)
    if (range) return range.value
    return FATURAMENTO_OPTIONS[FATURAMENTO_OPTIONS.length - 1].value
  }
  // Find matching range by max value
  const match = FATURAMENTO_OPTIONS.find(opt => opt.max === maxNum)
  if (match) return match.value
  // Fuzzy: find closest range
  const closest = FATURAMENTO_OPTIONS.find(opt => maxNum <= opt.max)
  if (closest) return closest.value
  return revenue
}

// Get color from revenue string (handles any format)
export function getColorFromRevenue(revenue: string | null): string | null {
  if (!revenue) return null
  const normalized = normalizeRevenue(revenue)
  const option = FATURAMENTO_OPTIONS.find(opt => opt.value === normalized)
  return option?.color || null
}

// Get qualification from revenue string (handles any format)
export function getQualificationFromRevenue(revenue: string | null): string | null {
  if (!revenue) return null
  const normalized = normalizeRevenue(revenue)
  const option = FATURAMENTO_OPTIONS.find(opt => opt.value === normalized)
  return option?.qualification || null
}

// Funnel options
export const FUNIL_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'nenhum', label: 'Nenhum' },
  { value: '50_scripts', label: '50 scripts' },
  { value: 'teste_arquetipos', label: 'Teste dos Arquetipos' },
  { value: 'mpm', label: 'MPM' },
  { value: 'implementacao_ia_julia', label: 'Implementacao de IA da Julia' },
  { value: 'social_selling_julia', label: 'Social Selling Julia' },
  { value: 'social_selling_cleiton', label: 'Social Selling Cleiton' },
  { value: 'social_selling_bethel', label: 'Social Selling Bethel' },
  { value: 'social_selling_kennedy', label: 'Social Selling Kennedy' },
  { value: 'formulario_instagram_cleiton', label: 'Formulario Instagram Cleiton' },
  { value: 'formulario_instagram_julia', label: 'Formulario Instagram Julia' },
  { value: 'formulario_instagram_kennedy', label: 'Formulario Instagram Kennedy' },
  { value: 'formulario_youtube', label: 'Formulario Youtube' },
  { value: 'indicacao_aluno', label: 'Indicacao de Aluno' },
  { value: 'indicacao_mentorado', label: 'Indicacao de Mentorado' },
  { value: 'indicacao_vendedor', label: 'Indicacao de Vendedor' },
  { value: 'indicacao_elite_premium', label: 'Indicacao Elite Premium' },
  { value: 'implementacao_comercial', label: 'Implementacao Comercial' },
  { value: 'implementacao_personalizada_ia', label: 'Implementacao Personalizada IA' },
  { value: 'mentoria_julia', label: 'Mentoria Julia' },
  { value: 'elite_premium', label: 'Elite Premium' },
  { value: 'bethel_club', label: 'Bethel Club' },
]

// Parse currency string to number
export function parseCurrency(value: string): number {
  const clean = value.replace(/[R$\s.]/g, '').replace(',', '.')
  return parseFloat(clean) || 0
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
