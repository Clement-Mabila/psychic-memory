'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { vaultApi } from '@/lib/api'
import { fmtDate, recordTypeBadge } from '../shared/helpers'

export function RecordsTab() {
  const [page,        setPage]        = useState(1)
  const [recordType,  setRecordType]  = useState('')
  const [erased,      setErased]      = useState('')
  const [subject,     setSubject]     = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expanded,    setExpanded]    = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vault-records', page, recordType, erased, subject],
    queryFn:  () =>
      vaultApi.getRecords({
        page,
        record_type:   recordType || undefined,
        erased:        erased     || undefined,
        subject_email: subject    || undefined,
      }),
    staleTime: 30_000,
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['vault-record', expanded],
    queryFn:  () => vaultApi.getRecord(expanded!),
    enabled:  !!expanded,
    staleTime: 60_000,
  })

  const records: any[] = (data as any)?.results ?? []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={recordType}
          onChange={e => { setRecordType(e.target.value); setPage(1) }}
          className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 outline-none"
        >
          <option value="">All types</option>
          <option value="Lead">Lead</option>
          <option value="Contact">Contact</option>
          <option value="LeadContact">LeadContact</option>
        </select>

        <select
          value={erased}
          onChange={e => { setErased(e.target.value); setPage(1) }}
          className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 outline-none"
        >
          <option value="">All records</option>
          <option value="false">Active only</option>
          <option value="true">Erased only</option>
        </select>

        <div className="flex items-center gap-1 flex-1 max-w-xs h-9 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5">
          <Search size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Subject email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { setSubject(searchInput); setPage(1) }
            }}
            className="flex-1 bg-transparent text-xs text-gray-600 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              {['Type', 'Original ID', 'Subject Email', 'Archived', 'Source', 'Status', ''].map(h => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400 dark:text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400 dark:text-slate-500">
                  No records
                </td>
              </tr>
            )}
            {records.map((r: any) => (
              <React.Fragment key={r.id}>
                <tr
                  className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <td className="px-4 py-3">{recordTypeBadge(r.record_type)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-slate-400">
                    {r.original_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-300">
                    {r.subject_email || <span className="text-gray-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                    {fmtDate(r.archived_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                    {r.source_action}
                  </td>
                  <td className="px-4 py-3">
                    {r.erased_at
                      ? <Badge variant="neutral">erased</Badge>
                      : <Badge variant="success">active</Badge>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-indigo-500 dark:text-indigo-400">
                    {expanded === r.id ? 'hide' : 'view'}
                  </td>
                </tr>

                {expanded === r.id && (
                  <tr key={`${r.id}-d`} className="bg-gray-50/80 dark:bg-slate-800/50">
                    <td colSpan={7} className="px-6 py-4">
                      {detailLoading ? (
                        <p className="text-xs text-gray-400 dark:text-slate-500">Loading payload…</p>
                      ) : (detail as any)?.data ? (
                        <pre className="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                          {JSON.stringify((detail as any).data, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-slate-500 italic">
                          Record has been erased — payload tombstoned
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {((data as any)?.total_pages ?? 0) > 1 && (
          <div className="px-4 py-2.5 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {(data as any)?.total} records
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs text-gray-500 dark:text-slate-400 px-2">
                {page} / {(data as any)?.total_pages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= ((data as any)?.total_pages ?? 1)}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
