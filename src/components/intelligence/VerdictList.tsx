'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CRITIC_NAMES } from './constants'
import { VerdictRow } from './VerdictRow'
import api from '@/lib/api'

export function VerdictList() {
  const [filterCritic,   setFilterCritic]   = useState('')
  const [filterSource,   setFilterSource]   = useState('')
  const [filterApproved, setFilterApproved] = useState('')
  const [trainingOnly,   setTrainingOnly]   = useState(false)
  const [filtersOpen,    setFiltersOpen]    = useState(false)
  const [page,           setPage]           = useState(1)

  const { data } = useQuery({
    queryKey: ['verdicts', filterCritic, filterSource, filterApproved, trainingOnly, page],
    queryFn:  () => api.get('/verdicts', {
      params: {
        ...(filterCritic    && { critic_id: filterCritic }),
        ...(filterSource    && { source: filterSource }),
        ...(filterApproved !== '' && { approved: filterApproved }),
        ...(trainingOnly    && { training_eligible: '1' }),
        page,
      },
    }).then(r => r.data),
  })

  const verdicts = (data?.verdicts ?? []) as any[]
  const total    = data?.total  ?? 0
  const pages    = data?.pages  ?? 1

  const activeFilters = [filterSource, filterApproved, trainingOnly ? '1' : ''].filter(Boolean).length

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">

      {/* Header + filters */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400 dark:text-slate-500" />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Verdicts</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{total.toLocaleString()} total</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Critic pills */}
          {Object.entries(CRITIC_NAMES).map(([id, name]) => (
            <button
              key={id}
              onClick={() => { setFilterCritic(filterCritic === id ? '' : id); setPage(1) }}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                filterCritic === id
                  ? 'bg-slate-900 dark:bg-neutral-700 text-white border-slate-900'
                  : 'bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-slate-600',
              )}
            >
              {filterCritic === id && <Check size={9} />}
              {name}
            </button>
          ))}

          {/* More filters */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={cn(
              'relative h-7 w-7 rounded-full border flex items-center justify-center transition-colors',
              filtersOpen || activeFilters > 0
                ? 'bg-slate-900 dark:bg-neutral-700 border-slate-900 dark:border-neutral-700 text-white'
                : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
            )}
          >
            <Filter size={12} />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-teal-500 text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expanded filters */}
      {filtersOpen && (
        <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center gap-4 flex-wrap bg-slate-50 dark:bg-neutral-800">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Source:</span>
            {[['', 'All'], ['claude', 'Claude'], ['llm', 'LLM']].map(([val, label]) => (
              <button key={val}
                onClick={() => { setFilterSource(val); setPage(1) }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                  filterSource === val
                    ? 'bg-slate-900 dark:bg-neutral-700 text-white border-slate-900'
                    : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-slate-600',
                )}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Outcome:</span>
            {[['', 'All'], ['true', 'Approved'], ['false', 'Rejected']].map(([val, label]) => (
              <button key={val}
                onClick={() => { setFilterApproved(val); setPage(1) }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                  filterApproved === val
                    ? 'bg-slate-900 dark:bg-neutral-700 text-white border-slate-900'
                    : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-slate-600',
                )}>
                {label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={trainingOnly}
              onChange={e => { setTrainingOnly(e.target.checked); setPage(1) }}
              className="rounded border-slate-300"
            />
            Training-eligible only
          </label>

          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterSource(''); setFilterApproved(''); setTrainingOnly(false); setPage(1) }}
              className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors ml-auto"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {verdicts.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">No verdicts match the current filters</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-neutral-800">
              {['Critic', 'Lead', 'Score', 'Outcome', 'Source', 'Train', 'Feedback', 'When'].map(h => (
                <th key={h} className="text-left px-5 py-2.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {verdicts.map((v: any) => <VerdictRow key={v.id} verdict={v} />)}
          </tbody>
        </table>
      )}

      {pages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">Page {page} of {pages}</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <Button size="sm" variant="ghost" disabled={page === pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
