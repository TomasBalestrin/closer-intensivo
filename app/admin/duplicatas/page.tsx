'use client'

import { useState } from 'react'
import { Button, Card } from '@/components/ui'
import { Search, Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface ParticipantInfo {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  is_opportunity: boolean
  created_at: string
  assigned_closer_id: string | null
  seller_closer_id: string | null
  checked_in_day1: boolean
  checked_in_day2: boolean
  checked_in_day3: boolean
  qualification: string | null
  revenue: string | null
}

interface DuplicateGroup {
  matchType: string
  matchValue: string
  participants: ParticipantInfo[]
}

interface CheckResult {
  totalParticipants: number
  totalOpportunities: number
  duplicateGroups: number
  totalExtras: number
  groups: DuplicateGroup[]
}

function getMatchLabel(type: string): string {
  switch (type) {
    case 'email': return 'Email'
    case 'cpf': return 'CPF'
    case 'name': return 'Nome'
    default: return type
  }
}

function getMatchColor(type: string): string {
  switch (type) {
    case 'email': return 'bg-red-100 text-red-800'
    case 'cpf': return 'bg-orange-100 text-orange-800'
    case 'name': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function hasMoreData(p: ParticipantInfo): number {
  let score = 0
  if (p.email) score += 1
  if (p.phone) score += 1
  if (p.cpf) score += 1
  if (p.assigned_closer_id) score += 2
  if (p.seller_closer_id) score += 1
  if (p.checked_in_day1) score += 3
  if (p.checked_in_day2) score += 3
  if (p.checked_in_day3) score += 3
  if (p.qualification) score += 1
  if (p.revenue) score += 1
  if (p.is_opportunity) score += 1
  return score
}

export default function DuplicatasPage() {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const checkDuplicates = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/check-duplicates')
      if (!res.ok) throw new Error('Erro ao verificar duplicatas')
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteParticipant = async (id: string) => {
    setDeleting(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/admin/check-duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      if (!res.ok) throw new Error('Erro ao deletar')
      setDeletedIds(prev => new Set(prev).add(id))
    } catch (err: any) {
      alert(`Erro: ${err.message}`)
    } finally {
      setDeleting(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const deleteAllExtras = async (group: DuplicateGroup) => {
    // Keep the participant with most data, delete the rest
    const sorted = [...group.participants].sort((a, b) => hasMoreData(b) - hasMoreData(a))
    const toDelete = sorted.slice(1).map(p => p.id).filter(id => !deletedIds.has(id))
    if (toDelete.length === 0) return

    if (!confirm(`Deletar ${toDelete.length} duplicata(s), mantendo "${sorted[0].name}"?`)) return

    setDeleting(prev => {
      const next = new Set(prev)
      toDelete.forEach(id => next.add(id))
      return next
    })
    try {
      const res = await fetch('/api/admin/check-duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: toDelete }),
      })
      if (!res.ok) throw new Error('Erro ao deletar')
      setDeletedIds(prev => {
        const next = new Set(prev)
        toDelete.forEach(id => next.add(id))
        return next
      })
    } catch (err: any) {
      alert(`Erro: ${err.message}`)
    } finally {
      setDeleting(prev => {
        const next = new Set(prev)
        toDelete.forEach(id => next.delete(id))
        return next
      })
    }
  }

  // Filter out groups where all extras have been deleted
  const activeGroups = result?.groups.filter(g => {
    const remaining = g.participants.filter(p => !deletedIds.has(p.id))
    return remaining.length > 1
  }) || []

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Verificar Duplicatas</h1>
      <p className="text-gray-500 mb-6">Identifique e remova participantes duplicados por email, CPF ou nome.</p>

      <Button onClick={checkDuplicates} disabled={loading} className="mb-6">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
        {loading ? 'Verificando...' : 'Verificar Duplicatas'}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-500">Total Participantes</p>
              <p className="text-2xl font-bold">{result.totalParticipants}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-500">Oportunidades</p>
              <p className="text-2xl font-bold">{result.totalOpportunities}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-500">Grupos Duplicados</p>
              <p className="text-2xl font-bold text-orange-600">{activeGroups.length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-500">Registros Extras</p>
              <p className="text-2xl font-bold text-red-600">{result.totalExtras - deletedIds.size}</p>
            </Card>
          </div>

          {activeGroups.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-green-700">Nenhuma duplicata encontrada!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeGroups.map((group, i) => {
                const sorted = [...group.participants]
                  .filter(p => !deletedIds.has(p.id))
                  .sort((a, b) => hasMoreData(b) - hasMoreData(a))
                const best = sorted[0]

                return (
                  <Card key={i} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getMatchColor(group.matchType)}`}>
                          {getMatchLabel(group.matchType)}: {group.matchValue}
                        </span>
                        <span className="text-sm text-gray-500">{sorted.length} registros</span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteAllExtras(group)}
                        disabled={deleting.size > 0}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remover extras
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {sorted.map((p, j) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                            j === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.name}</span>
                              {j === 0 && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">manter</span>
                              )}
                              {p.is_opportunity && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">oportunidade</span>
                              )}
                              {(p.checked_in_day1 || p.checked_in_day2 || p.checked_in_day3) && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">check-in</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {p.email && <span className="mr-3">{p.email}</span>}
                              {p.phone && <span className="mr-3">{p.phone}</span>}
                              {p.cpf && <span className="mr-3">CPF: {p.cpf}</span>}
                              <span>Criado: {new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                          {j > 0 && (
                            <button
                              onClick={() => deleteParticipant(p.id)}
                              disabled={deleting.has(p.id)}
                              className="ml-2 p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                            >
                              {deleting.has(p.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
