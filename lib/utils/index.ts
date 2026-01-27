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
