'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Download,
  Search, XCircle, CheckCircle, Users, ShieldCheck, Zap,
  SlidersHorizontal, UserCircle, LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { vaultApi } from '@/lib/api'
import { COLLECTION_DEFS, TABLE_COLS } from './shared/constants'
import { fmtDatetime, cellValue } from './shared/helpers'

interface CollectionDetailProps {
  tier:             string
  onBack:           () => void
  onSelectIdentity: (id: string) => void
}

export function CollectionDetail({ tier, onBack, onSelectIdentity }: CollectionDetailProps) {
  const def = COLLECTION_DEFS.find(d => d.tier === tier)!
  const qc  = useQueryClient()

  const [activeTab,    setActiveTab]    = useState('contacts')
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [searchInput,  setSearchInput]  = useState('')
  const [signalFilter, setSignalFilter] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vault-identities', page, search, tier],
    queryFn:  () => vaultApi.getIdentities({ page, search: search || undefined, tier }),
    staleTime: 30_000,
  })

  const { data: syncData } = useQuery({
    queryKey: ['vault-sync-status'],
    queryFn:  vaultApi.getSyncStatus,
    staleTime: 15_000,
  })

  const { data: allCollections } = useQuery({
    queryKey: ['vault-identity-collections'],
    queryFn:  vaultApi.getCollections,
    staleTime: 30_000,
  })

  const triggerMut = useMutation({
    mutationFn: vaultApi.triggerSync,
    onSuccess: () =>
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['vault-identities'] })
        qc.invalidateQueries({ queryKey: ['vault-identity-collections'] })
      }, 2500),
  })

  const exportMut = useMutation({
    mutationFn: () => vaultApi.exportIdentities({ tier, search: search || undefined }),
  })

  const persons: any[] = (data as any)?.results ?? []
  const total: number  = (data as any)?.total   ?? 0

  const filtered = signalFilter == null
    ? persons
    : persons.filter((p: any) => {
        if (signalFilter === 'email')    return !!p.canonical_email
        if (signalFilter === 'phone')    return !!p.canonical_phone
        if (signalFilter === 'linkedin') return !!p.canonical_linkedin_url
        if (signalFilter === 'multi')    return p.total_appearances > 1
        return true
      })

  const filterPills = [
    { id: null,       label: 'All contacts',    count: total },
    { id: 'email',    label: 'Has email',        count: persons.filter((p: any) => !!p.canonical_email).length },
    { id: 'phone',    label: 'Has phone',        count: persons.filter((p: any) => !!p.canonical_phone).length },
    { id: 'linkedin', label: 'LinkedIn present', count: persons.filter((p: any) => !!p.canonical_linkedin_url).length },
    { id: 'multi',    label: 'Multi-company',    count: persons.filter((p: any) => p.total_appearances > 1).length },
  ]

  const grandTotal   = (allCollections as any)?.total ?? 1
  const pct          = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0
  const tierBarColor = ({
    actionable:   'bg-emerald-500',
    enrichable:   'bg-amber-500',
    discoverable: 'bg-slate-400',
  } as Record<string, string>)[tier] ?? 'bg-blue-500'

  return (
    <div className="bg-white dark:bg-zinc-950 min-h-screen">

      {/* ── Header ── */}
      <div className="border-b border-zinc-200 dark:border-white/10 px-6 sm:px-8 pt-8 pb-6">
        <button
          onClick={onBack}
          className="mb-5 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to collections
        </button>

        {/* Title row */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex gap-4 items-start">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0',
              def.iconBg,
            )}>
              {def.abbr}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {def.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
                {def.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />GDPR compliant
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />Synced every 30s
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />{total.toLocaleString()} identities
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              loading={triggerMut.isPending}
              onClick={() => triggerMut.mutate()}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Now
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={exportMut.isPending}
              onClick={() => exportMut.mutate()}
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-5 gap-5">
          {[
            { label: 'Signal coverage',   value: def.coverage },
            { label: 'Total contacts',    value: total.toLocaleString() },
            { label: 'Refresh rate',      value: 'Every 30s' },
            { label: 'Total appearances', value: ((syncData as any)?.total_appearances ?? 0).toLocaleString() },
            { label: 'Compliance',        value: 'GDPR ready', isGdpr: true },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500 border-b border-zinc-200 dark:border-white/10 pb-1 mb-1.5">
                {s.label}
              </p>
              {s.isGdpr ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> {s.value}
                </span>
              ) : (
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{s.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="border-b border-zinc-200 dark:border-white/10 px-6 sm:px-8 flex gap-6">
        {['Contacts', 'Statistics'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t.toLowerCase())}
            className={cn(
              'py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === t.toLowerCase()
                ? 'border-blue-500 text-blue-600 dark:text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="px-6 sm:px-8 py-6">

        {/* Contacts tab */}
        {activeTab === 'contacts' && (
          <>
            {/* Content header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-zinc-400" /> Contacts
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { setSearch(searchInput); setPage(1) }
                    }}
                    className="bg-transparent text-xs text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none w-28"
                  />
                  {search && (
                    <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
                      <XCircle className="w-3 h-3 text-zinc-400 hover:text-zinc-600" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => exportMut.mutate()}
                  disabled={exportMut.isPending}
                  className="text-sm text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {exportMut.isPending ? 'Exporting…' : 'Export CSV'}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1">Filters:</span>
              {filterPills.map(fp => (
                <button
                  key={String(fp.id)}
                  onClick={() => setSignalFilter(fp.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-colors',
                    signalFilter === fp.id
                      ? 'bg-blue-600/10 dark:bg-blue-600/20 border-blue-500/50 text-blue-600 dark:text-blue-300'
                      : 'border-zinc-200 dark:border-white/15 text-zinc-400 hover:border-zinc-400 dark:hover:border-white/30 hover:text-zinc-900 dark:hover:text-white',
                  )}
                >
                  {signalFilter === fp.id && <CheckCircle className="w-3 h-3" />}
                  {fp.label}
                  <span className={cn(
                    'tabular-nums',
                    signalFilter === fp.id
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-zinc-400 dark:text-zinc-500',
                  )}>
                    {fp.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Sidebar + table */}
            <div className="flex gap-4">
              {/* Left sidebar icon buttons */}
              <div className="flex flex-col gap-2 shrink-0 pt-1">
                {[
                  { Icon: SlidersHorizontal, label: 'Filters' },
                  { Icon: UserCircle,        label: 'Contact' },
                  { Icon: LayoutGrid,        label: 'Layout'  },
                ].map(({ Icon, label }) => (
                  <button
                    key={label}
                    title={label}
                    className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-white/15 bg-white dark:bg-transparent flex flex-col items-center justify-center gap-0.5 hover:border-zinc-400 dark:hover:border-white/30 transition-colors group"
                  >
                    <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors" />
                    <span className="text-zinc-400 dark:text-zinc-500" style={{ fontSize: '9px' }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Data table */}
              <div className="flex-1 rounded-xl border border-zinc-200 dark:border-white/10 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-white/5">
                      <th className="w-10 px-3 py-3" />
                      {TABLE_COLS.map(col => (
                        <th
                          key={col}
                          className="px-4 py-3 text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap"
                        >
                          {col.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={TABLE_COLS.length + 1} className="px-4 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
                          Loading…
                        </td>
                      </tr>
                    )}
                    {!isLoading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={TABLE_COLS.length + 1} className="px-4 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
                          No contacts in this collection
                        </td>
                      </tr>
                    )}
                    {filtered.map((p: any) => (
                      <tr
                        key={p.id}
                        onClick={() => onSelectIdentity(p.id)}
                        className="border-b border-zinc-50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <td className="px-3 py-3">
                          <ChevronRight className="w-4 h-4 text-zinc-200 dark:text-zinc-700 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 transition-colors" />
                        </td>
                        {TABLE_COLS.map(col => {
                          const val = cellValue(p, col)
                          return (
                            <td
                              key={col}
                              className={cn(
                                'px-4 py-3 whitespace-nowrap text-xs',
                                !val
                                  ? 'text-zinc-300 dark:text-zinc-600 italic font-mono'
                                  : col === 'name'
                                  ? 'text-zinc-800 dark:text-zinc-200 font-medium'
                                  : 'font-mono text-zinc-600 dark:text-zinc-300',
                              )}
                            >
                              {val ?? 'null'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {((data as any)?.total_pages ?? 0) > 1 && (
                  <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {total.toLocaleString()} contacts
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-1 rounded disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-400" />
                      </button>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 px-2">
                        {page} / {(data as any)?.total_pages}
                      </span>
                      <button
                        disabled={page >= ((data as any)?.total_pages ?? 1)}
                        onClick={() => setPage(p => p + 1)}
                        className="p-1 rounded disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Statistics tab */}
        {activeTab === 'statistics' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Share of total identities
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', tierBarColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white w-10 text-right">
                  {pct}%
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {total.toLocaleString()} of {grandTotal.toLocaleString()} total identities
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Signal coverage', value: def.coverage },
                {
                  label: 'Last sync',
                  value: (syncData as any)?.recent_jobs?.[0]?.started_at
                    ? fmtDatetime((syncData as any).recent_jobs[0].started_at)
                    : 'Not yet',
                },
                { label: 'Sync frequency', value: 'Every 30 seconds' },
                { label: 'GDPR status',    value: 'Compliant' },
              ].map(s => (
                <div
                  key={s.label}
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/10 rounded-xl p-4"
                >
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">{s.label}</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
