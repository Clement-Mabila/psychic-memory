'use client'
import { useState, useRef, useEffect } from 'react'
import { ListFilter, X, Check, Building2, Search, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FiltersState } from './types'

const TIER_OPTIONS = [
  { value: 'verified',  label: 'Verified',  bg: 'bg-blue-50 dark:bg-blue-950/40',  text: 'text-white' },
  { value: 'probable',  label: 'Probable',  bg: 'bg-amber-400',                     text: 'text-white' },
  { value: 'inferred',  label: 'Inferred',  bg: 'bg-pink-500',                      text: 'text-white' },
  { value: 'not_found', label: 'No Email',  bg: 'bg-red-50 dark:bg-red-950/400',   text: 'text-white' },
]

export function FiltersButton({
  filters,
  onChange,
  activeCount,
}: {
  filters: FiltersState
  onChange: (patch: Partial<FiltersState>) => void
  activeCount: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const clear = () => onChange({
    tierFilter: '', resolvableOnly: false, zbUnverified: false, company: '', domain: '', topN: '',
  })

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'relative h-10 w-10 rounded-2xl border flex items-center justify-center transition-colors',
          open
            ? 'bg-slate-900 dark:bg-neutral-700 border-slate-900 dark:border-slate-700 text-white'
            : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
        )}
      >
        <ListFilter className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-fuchsia-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-700 shadow-xl dark:shadow-black/40 p-4 space-y-4">

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Filters</p>
            {activeCount > 0 && (
              <button onClick={clear} className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Email status */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Email status</p>
            <div className="flex flex-wrap gap-2">
              {TIER_OPTIONS.map(opt => {
                const selected = filters.tierFilter === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ tierFilter: selected ? '' : opt.value })}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selected
                        ? 'bg-slate-900 dark:bg-neutral-700 text-white border-slate-900'
                        : `${opt.bg} ${opt.text} border-transparent`,
                    )}
                  >
                    {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Quick filters */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Quick filters</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'resolvableOnly', label: 'Needs real email' },
                { key: 'zbUnverified',   label: 'Not ZB verified'  },
              ].map(({ key, label }) => {
                const active = filters[key as keyof FiltersState] === true
                return (
                  <button
                    key={key}
                    onClick={() => onChange({ [key]: !active } as Partial<FiltersState>)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      active
                        ? 'bg-slate-900 dark:bg-neutral-700 text-white border-slate-900'
                        : 'bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600',
                    )}
                  >
                    {active && <Check className="h-3 w-3 flex-shrink-0" />}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Advanced */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Advanced</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  placeholder="Company name contains…"
                  value={filters.company}
                  onChange={e => onChange({ company: e.target.value })}
                  className="flex-1 h-8 px-2.5 text-xs bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg outline-none focus:border-slate-300 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  placeholder="Domain contains… (e.g. gateway)"
                  value={filters.domain}
                  onChange={e => onChange({ domain: e.target.value })}
                  className="flex-1 h-8 px-2.5 text-xs bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg outline-none focus:border-slate-300 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  placeholder="Top N per company (e.g. 3)"
                  value={filters.topN}
                  onChange={e => onChange({ topN: e.target.value })}
                  className="flex-1 h-8 px-2.5 text-xs bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg outline-none focus:border-slate-300 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500"
                />
              </div>
            </div>
            {(filters.company || filters.domain || filters.topN) && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                {filters.topN ? `Top ${filters.topN} contacts` : 'All contacts'}
                {filters.company ? ` from "${filters.company}"` : ''}
                {filters.domain  ? ` on *${filters.domain}*`   : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
