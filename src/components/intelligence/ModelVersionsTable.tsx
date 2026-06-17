'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime } from '@/lib/utils'
import { MV_STATUS_STYLE } from './constants'

interface Props {
  models:    any[]
  onPromote: (id: number) => void
  onRetire:  (id: number) => void
  promoting: boolean
  retiring:  boolean
}

export function ModelVersionsTable({ models, onPromote, onRetire, promoting, retiring }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = models.filter(m => m.is_active).length
  const subtitle = models.length === 0
    ? 'No versions trained yet'
    : `${models.length} version${models.length !== 1 ? 's' : ''} · ${activeCount} active`

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 shadow-sm dark:shadow-none overflow-hidden">

      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center flex-shrink-0">
            <Brain size={15} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">Model Versions</h2>
            <p className="text-sm text-gray-400 dark:text-slate-500 leading-tight mt-0.5">{subtitle}</p>
          </div>
        </div>
        {open
          ? <ChevronUp size={16} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
          : <ChevronDown size={16} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />}
      </button>

      {/* Expandable table */}
      {open && (
        <>
          <div className="h-px bg-gray-100 dark:bg-neutral-800" />
          {models.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
              No model versions yet — run a fine-tune job first
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-neutral-800">
                    {['Version', 'Scope', 'Status', 'Accuracy', 'Examples', 'Promoted', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.map((mv: any) => (
                    <tr key={mv.id} className="border-b border-gray-50 dark:border-neutral-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {mv.is_active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          )}
                          <span className="font-mono text-gray-700 dark:text-slate-300">{mv.version_tag}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-400 dark:text-slate-500">{mv.critic_id || 'shared'}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-medium',
                          MV_STATUS_STYLE[mv.status] ?? 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-slate-400',
                        )}>
                          {mv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-700 dark:text-slate-300">
                        {mv.eval_accuracy != null ? `${(mv.eval_accuracy * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-400 dark:text-slate-500">{mv.dataset?.example_count ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-400 dark:text-slate-500">
                        {mv.promoted_at ? formatRelativeTime(mv.promoted_at) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          {mv.status !== 'promoted' && mv.status !== 'base' && (
                            <Button size="sm" variant="secondary" loading={promoting}
                              onClick={() => onPromote(mv.id)}>
                              Promote
                            </Button>
                          )}
                          {mv.is_active && (
                            <Button size="sm" variant="ghost" loading={retiring}
                              onClick={() => onRetire(mv.id)}>
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
        </>
      )}
    </div>
  )
}
