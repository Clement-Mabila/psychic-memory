'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Search, XCircle, Building2, Globe, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { vaultApi } from '@/lib/api'

interface CompaniesCollectionProps {
  onBack: () => void
}

const VERTICAL_LABELS: Record<string, string> = {
  casino:   'Casino',
  airport:  'Airport',
  transit:  'Transit',
  hospital: 'Hospital',
  mall:     'Mall',
}

export function CompaniesCollection({ onBack }: CompaniesCollectionProps) {
  const [page,        setPage]        = useState(1)
  const [search,      setSearch]      = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['vault-companies', page, search],
    queryFn:  () => vaultApi.getCompanies({ page, search: search || undefined }),
    staleTime: 30_000,
  })

  const companies: any[] = (data as any)?.results    ?? []
  const total: number    = (data as any)?.total       ?? 0
  const totalPages       = (data as any)?.total_pages ?? 1

  const COLS = ['Company', 'Domain', 'Vertical / Industry', 'Employees', 'Revenue Range', 'Contacts', 'HQ']

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
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 bg-indigo-600">
            CO
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Company Accounts
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
              Firmographic profiles of every organisation tracked — domain, industry, size, revenue, and contact coverage.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />{total.toLocaleString()} companies
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />Domain-indexed
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />GDPR compliant
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 sm:px-8 py-6">

        {/* Search */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-lg">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search company or domain…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { setSearch(searchInput); setPage(1) }
              }}
              className="bg-transparent text-xs text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none w-52"
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
                {COLS.map(h => (
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
                  <td colSpan={COLS.length} className="px-4 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && companies.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    No companies found
                  </td>
                </tr>
              )}
              {companies.map((co: any) => {
                const hq      = [co.hq_city, co.hq_country].filter(Boolean).join(', ')
                const vertical = VERTICAL_LABELS[co.vertical] ?? co.vertical ?? co.industry
                return (
                  <tr
                    key={co.id}
                    className="border-b border-zinc-50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {co.company_name}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {co.domain}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {vertical || <span className="text-zinc-300 dark:text-zinc-600 italic font-mono">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {co.employee_count != null
                        ? co.employee_count.toLocaleString()
                        : <span className="text-zinc-300 dark:text-zinc-600 italic font-mono">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {co.revenue_range || <span className="text-zinc-300 dark:text-zinc-600 italic font-mono">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {co.contact_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {hq || <span className="text-zinc-300 dark:text-zinc-600 italic font-mono">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {total.toLocaleString()} companies
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
