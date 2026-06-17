'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Search, XCircle, Link2, CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { vaultApi } from '@/lib/api'
import { TIER_META } from './shared/constants'

interface LinkedInCollectionProps {
  onBack:           () => void
  onSelectIdentity: (id: string) => void
}

const TIER_PILLS = [
  { id: null,           label: 'All'          },
  { id: 'actionable',   label: 'Actionable'   },
  { id: 'enrichable',   label: 'Enrichable'   },
  { id: 'discoverable', label: 'Discoverable' },
]

function liHandle(url: string): string {
  const match = url.match(/linkedin\.com(\/in\/[^/?#]+)/)
  return match ? match[1] : url
}

function liHref(url: string): string {
  if (url.startsWith('http')) return url
  return `https://www.linkedin.com${url.startsWith('/') ? '' : '/'}${url}`
}

export function LinkedInCollection({ onBack, onSelectIdentity }: LinkedInCollectionProps) {
  const [page,        setPage]        = useState(1)
  const [search,      setSearch]      = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [tierFilter,  setTierFilter]  = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vault-linkedin', page, search, tierFilter],
    queryFn:  () => vaultApi.getLinkedInProfiles({
      page,
      search: search || undefined,
      tier:   tierFilter || undefined,
    }),
    staleTime: 30_000,
  })

  const profiles: any[] = (data as any)?.results    ?? []
  const total: number   = (data as any)?.total       ?? 0
  const totalPages      = (data as any)?.total_pages ?? 1

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

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 bg-violet-600">
            LI
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              LinkedIn Profiles
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
              Every identity in the vault that has a verified LinkedIn URL — with current company, title, and signal coverage.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5" />{total.toLocaleString()} profiles
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 sm:px-8 py-6">

        {/* Filters + search */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Signal tier:</span>
            {TIER_PILLS.map(p => (
              <button
                key={String(p.id)}
                onClick={() => { setTierFilter(p.id); setPage(1) }}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1',
                  tierFilter === p.id
                    ? 'bg-violet-600/10 dark:bg-violet-600/20 border-violet-500/50 text-violet-600 dark:text-violet-300'
                    : 'border-zinc-200 dark:border-white/15 text-zinc-400 hover:border-zinc-400 dark:hover:border-white/30 hover:text-zinc-900 dark:hover:text-white',
                )}
              >
                {tierFilter === p.id && <CheckCircle className="w-3 h-3" />}
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-lg">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search name or company…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { setSearch(searchInput); setPage(1) }
              }}
              className="bg-transparent text-xs text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none w-44"
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
                <XCircle className="w-3 h-3 text-zinc-400 hover:text-zinc-600" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-white/5">
                {['Name', 'LinkedIn', 'Current Company', 'Title', 'Signal Tier', 'Appearances'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && profiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    No LinkedIn profiles found
                  </td>
                </tr>
              )}
              {profiles.map((p: any) => {
                const tier    = TIER_META[p.quality_tier]
                const handle  = p.canonical_linkedin_url ? liHandle(p.canonical_linkedin_url) : null
                const href    = p.canonical_linkedin_url ? liHref(p.canonical_linkedin_url)   : null
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectIdentity(p.id)}
                    className="border-b border-zinc-50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-xs font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {p.canonical_name || <span className="italic text-zinc-400">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3 shrink-0" />
                          {handle}
                        </a>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600 italic font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {p.latest_company || <span className="text-zinc-300 dark:text-zinc-600 italic font-mono">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap max-w-[180px] truncate">
                      {p.latest_title || <span className="text-zinc-300 dark:text-zinc-600 italic font-mono">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tier ? (
                        <span className={cn('flex items-center gap-1 text-xs', tier.activeText)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tier.dot)} />
                          {tier.label}
                        </span>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600 italic font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {p.total_appearances}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {total.toLocaleString()} profiles
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
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
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
    </div>
  )
}
