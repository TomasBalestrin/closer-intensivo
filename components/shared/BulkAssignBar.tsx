'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Select, useToast } from '@/components/ui'
import { Users, X, UserPlus } from 'lucide-react'
import { User } from '@/lib/types'

interface BulkAssignBarProps {
  selectedIds: string[]
  onClear: () => void
  onSuccess: () => void
}

export function BulkAssignBar({ selectedIds, onClear, onSuccess }: BulkAssignBarProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [closers, setClosers] = useState<User[]>([])
  const [selectedCloser, setSelectedCloser] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchClosers()
  }, [])

  const fetchClosers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'closer')
      .order('name')

    setClosers(data || [])
  }

  const handleBulkAssign = async () => {
    if (!selectedCloser) {
      showToast('Selecione um closer', 'error')
      return
    }

    setLoading(true)

    try {
      // Update all selected participants with the new closer
      const { error } = await supabase
        .from('participants')
        .update({ assigned_closer_id: selectedCloser })
        .in('id', selectedIds)

      if (error) throw error

      showToast(`${selectedIds.length} participante(s) atribuído(s) com sucesso!`, 'success')
      setSelectedCloser('')
      onClear()
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Erro ao atribuir closer', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (selectedIds.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
            <Users className="h-5 w-5" />
            <span className="font-medium">{selectedIds.length} selecionado(s)</span>
          </div>
          <button
            onClick={onClear}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedCloser}
            onChange={(e) => setSelectedCloser(e.target.value)}
            options={[
              { value: '', label: 'Selecione um closer...' },
              ...closers.map(c => ({ value: c.id, label: c.name })),
            ]}
            className="w-64"
          />
          <Button
            onClick={handleBulkAssign}
            loading={loading}
            disabled={!selectedCloser}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Atribuir Closer
          </Button>
        </div>
      </div>
    </div>
  )
}
