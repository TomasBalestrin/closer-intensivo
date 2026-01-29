import { Avatar } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Trophy } from 'lucide-react'

export interface TopCloserData {
  id: string
  name: string
  photo_url?: string | null
  salesCount: number
  totalValue: number
  entryValue: number
}

interface TopClosersProps {
  closers: TopCloserData[]
}

export function TopClosers({ closers }: TopClosersProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-800">TOP 3 Closers</h2>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {closers.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum closer com vendas ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {closers.map((closer, i) => (
              <div
                key={closer.id}
                className={`text-center p-6 rounded-xl ${
                  i === 0
                    ? 'bg-amber-50 border-2 border-amber-200'
                    : i === 1
                    ? 'bg-gray-50 border border-gray-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}
              >
                <div className="flex items-center justify-center mb-3">
                  <Trophy
                    className={`h-8 w-8 ${
                      i === 0
                        ? 'text-amber-500'
                        : i === 1
                        ? 'text-gray-400'
                        : 'text-orange-500'
                    }`}
                  />
                  <span className="text-2xl font-bold ml-1">{i + 1}º</span>
                </div>
                <Avatar
                  src={closer.photo_url}
                  alt={closer.name}
                  size="xl"
                  className="mx-auto mb-3"
                />
                <h3 className="font-semibold text-gray-900">{closer.name}</h3>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-gray-600">
                    Vendas: <span className="font-medium">{closer.salesCount}</span>
                  </p>
                  <p className="text-gray-600">
                    Valor: <span className="font-medium text-green-600">{formatCurrency(closer.totalValue)}</span>
                  </p>
                  <p className="text-gray-600">
                    Entrada: <span className="font-medium">{formatCurrency(closer.entryValue)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
