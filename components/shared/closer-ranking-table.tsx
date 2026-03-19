import { memo } from 'react'
import { Avatar } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'
import type { TopCloserData } from './top-closers'

interface CloserRankingTableProps {
  closers: TopCloserData[]
}

export const CloserRankingTable = memo(function CloserRankingTable({ closers }: CloserRankingTableProps) {
  if (closers.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-800">Ranking Geral</h2>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">#</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Closer</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Vendas</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Valor de Venda</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Valor de Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {closers.map((closer, i) => (
                <tr
                  key={closer.id}
                  className={`transition-colors hover:bg-gray-50 ${
                    i < 3 ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      i === 0
                        ? 'bg-amber-100 text-amber-700'
                        : i === 1
                        ? 'bg-gray-200 text-gray-700'
                        : i === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={closer.photo_url}
                        alt={closer.name}
                        size="sm"
                      />
                      <span className="font-medium text-gray-900">{closer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-semibold rounded-full px-3 py-1 text-sm">
                      {closer.salesCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-green-600">{formatCurrency(closer.totalValue)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-700">{formatCurrency(closer.entryValue)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {closers.map((closer, i) => (
            <div
              key={closer.id}
              className={`p-4 ${i < 3 ? 'bg-amber-50/30' : ''}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                  i === 0
                    ? 'bg-amber-100 text-amber-700'
                    : i === 1
                    ? 'bg-gray-200 text-gray-700'
                    : i === 2
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {i + 1}
                </span>
                <Avatar
                  src={closer.photo_url}
                  alt={closer.name}
                  size="sm"
                />
                <span className="font-medium text-gray-900">{closer.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Vendas</p>
                  <p className="font-semibold text-blue-700">{closer.salesCount}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Valor Venda</p>
                  <p className="font-semibold text-green-600 text-xs">{formatCurrency(closer.totalValue)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Entrada</p>
                  <p className="font-semibold text-gray-700 text-xs">{formatCurrency(closer.entryValue)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})
