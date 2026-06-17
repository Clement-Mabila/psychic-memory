'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { List, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime } from '@/lib/utils'
import { ModelVersionCard } from '@/components/intelligence/ModelVersionCard'
import { MV_STATUS_STYLE } from '@/components/intelligence/constants'
import api from '@/lib/api'

type ViewMode = 'list' | 'table'

const VIEW_TABS: { id: ViewMode; label: string; Icon: any }[] = [
  { id: 'list',  label: 'List',  Icon: List   },
  { id: 'table', label: 'Table', Icon: Table2 },
]

const STATUS_FILTERS = ['all', 'promoted', 'trained', 'evaluating', 'retired']

export default function ModelsPage() {
  const qc = useQueryClient()
  const [view,         setView]         = useState<ViewMode>('list')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey:  ['training-models'],
    queryFn:   () => api.get('/training/models').then(r => r.data),
    staleTime: 10_000,
  })

  const promoteMutation = useMutation({
    mutationFn: (id: number) => api.post(`/training/models/${id}/promote`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['training-models'] }),
  })

  const retireMutation = useMutation({
    mutationFn: (id: number) => api.post(`/training/models/${id}/retire`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['training-models'] }),
  })

  const allModels: any[] = data?.models ?? []
  const models = statusFilter === 'all'
    ? allModels
    : allModels.filter(m => m.status === statusFilter)

  const activeCount = allModels.filter(m => m.is_active).length

  return (
    <div className="p-7">

      {/* Header row — matches leads page */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">

        {/* Left: view tabs */}
        <div className="flex items-center gap-0.5">
          {VIEW_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                view === id
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Right: status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize',
                statusFilter === s
                  ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary line */}
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
        {allModels.length} version{allModels.length !== 1 ? 's' : ''} · {activeCount} active
        {statusFilter !== 'all' && ` · showing ${models.length} ${statusFilter}`}
      </p>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="flex flex-col gap-2">
          {isLoading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-neutral-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </>
          )}
          {!isLoading && models.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">
              No model versions match the current filter
            </p>
          )}
          {models.map((mv: any) => (
            <ModelVersionCard
              key={mv.id}
              mv={mv}
              onPromote={id => promoteMutation.mutate(id)}
              onRetire={id => retireMutation.mutate(id)}
              promoting={promoteMutation.isPending}
              retiring={retireMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                {['Version', 'Scope', 'Status', 'Accuracy', 'Examples', 'Base model', 'Promoted', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && models.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                    No model versions match the current filter
                  </td>
                </tr>
              )}
              {models.map((mv: any) => (
                <tr key={mv.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {mv.is_active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Active" />
                      )}
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{mv.version_tag}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {mv.critic_id || 'shared'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      MV_STATUS_STYLE[mv.status] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                    )}>
                      {mv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                    {mv.eval_accuracy != null ? `${(mv.eval_accuracy * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {mv.dataset?.example_count ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {mv.base_model}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {mv.promoted_at ? formatRelativeTime(mv.promoted_at) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      {mv.status !== 'promoted' && mv.status !== 'base' && (
                        <Button size="sm" variant="secondary"
                          loading={promoteMutation.isPending}
                          onClick={() => promoteMutation.mutate(mv.id)}>
                          Promote
                        </Button>
                      )}
                      {mv.is_active && (
                        <Button size="sm" variant="ghost"
                          loading={retireMutation.isPending}
                          onClick={() => retireMutation.mutate(mv.id)}>
                          Retire
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
