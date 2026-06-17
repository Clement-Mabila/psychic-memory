'use client'

import { useState, useEffect } from 'react'
import {
  X, Building2, Globe, Check, Loader2, AlertCircle,
  Search, Sparkles, Link2, XCircle,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import CompanyAvatar from './CompanyAvatar'

interface Suggestion {
  lead_id: string
  company_name: string
  domain: string
  stage: string
  score: number | null
  confidence: number
  reason: string
}

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function CreateGroupModal({ onClose, onCreated }: Props) {
  const [name, setName]           = useState('')
  const [domain, setDomain]       = useState('')
  const [debouncedQ, setDebouncedQ] = useState({ name: '', domain: '' })
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [searchQ, setSearchQ]     = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const qc = useQueryClient()

  // Debounce suggestion query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ({ name, domain }), 500)
    return () => clearTimeout(t)
  }, [name, domain])

  // Debounce manual search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQ), 300)
    return () => clearTimeout(t)
  }, [searchQ])

  const { data: suggestions, isFetching: loadingSuggestions } = useQuery({
    queryKey: ['group-suggestions', debouncedQ.name, debouncedQ.domain],
    queryFn: () =>
      api.post('/corporate-groups/suggest_subsidiaries', {
        parent_name:   debouncedQ.name,
        parent_domain: debouncedQ.domain,
      }).then(r => r.data as Suggestion[]),
    enabled: debouncedQ.name.length >= 2 || debouncedQ.domain.length >= 4,
    staleTime: 30_000,
  })

  const { data: searchData, isFetching: loadingSearch } = useQuery({
    queryKey: ['leads-search', searchDebounced],
    queryFn: () =>
      api.get('/leads/', { params: { search: searchDebounced, page_size: 8 } })
        .then(r => r.data?.leads ?? []),
    enabled: searchDebounced.length >= 2,
    staleTime: 30_000,
  })

  const suggestedIds = new Set((suggestions ?? []).map((s: Suggestion) => s.lead_id))

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/corporate-groups', { name, root_domain: domain })
        .then(async (r) => {
          const groupId = r.data.id
          // Link selected subsidiaries
          const linkPromises = Array.from(selected).map(leadId =>
            api.post(`/leads/${leadId}/set_group`, { corporate_group_id: groupId })
          )
          await Promise.all(linkPromises)
          return r.data
        }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corporate-groups'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['leads-kanban'] })
      onCreated()
      onClose()
    },
  })

  const toggleLead = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const showSuggestions = debouncedQ.name.length >= 2 || debouncedQ.domain.length >= 4

  const allCandidates: { lead_id: string; company_name: string; domain: string; reason?: string; confidence?: number }[] = [
    ...(showSuggestions ? (suggestions ?? []) : []),
    ...(searchData ?? [])
      .filter((l: any) => !suggestedIds.has(l.id))
      .map((l: any) => ({ lead_id: l.id, company_name: l.company_name, domain: l.domain })),
  ]

  const canCreate = name.trim().length >= 2 && domain.trim().length >= 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-indigo-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">New Parent Company</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Name + domain fields */}
          <div className="p-5 space-y-3 border-b border-gray-100 dark:border-neutral-800">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Company Name</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Mohegan Gaming & Entertainment"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Corporate Domain</label>
              <div className="relative">
                <Globe size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                <input
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="mohegangaming.com"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Link subsidiaries — always visible */}
          <div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {showSuggestions
                  ? <Sparkles size={11} className="text-indigo-400" />
                  : <Search size={11} className="text-gray-400" />
                }
                <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  {showSuggestions ? 'Suggested Subsidiaries' : 'Link Subsidiaries'}
                </p>
              </div>
              {(loadingSuggestions || loadingSearch) && <Loader2 size={11} className="animate-spin text-gray-400" />}
            </div>

            {/* Manual search — always visible */}
            <div className="px-4 py-2 border-b border-gray-50 dark:border-neutral-800/60">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search companies to link…"
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-600 dark:text-slate-400 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-neutral-800/60">
              {allCandidates.length === 0 && !loadingSuggestions && !loadingSearch && (
                <div className="py-6 text-center text-xs text-gray-400 dark:text-slate-500">
                  {searchDebounced.length >= 2 || showSuggestions
                    ? 'No matching companies found'
                    : 'Type a company name above or search to link subsidiaries'}
                </div>
              )}
              {allCandidates.map(item => {
                const checked = selected.has(item.lead_id)
                return (
                  <button
                    key={item.lead_id}
                    onClick={() => toggleLead(item.lead_id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                      checked
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300 dark:border-neutral-600 bg-white dark:bg-zinc-800'
                    )}>
                      {checked && <Check size={10} className="text-white" />}
                    </div>
                    <CompanyAvatar domain={item.domain} name={item.company_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{item.company_name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{item.domain}</p>
                    </div>
                    {item.confidence != null && (
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[10px] text-indigo-400 font-medium">
                          {Math.round(item.confidence * 100)}%
                        </span>
                        {item.reason && (
                          <span className="text-[9px] text-gray-300 dark:text-neutral-600 truncate max-w-[100px]">
                            {item.reason.split(' ').slice(0, 3).join(' ')}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected count strip */}
          {selected.size > 0 && (
            <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-t border-indigo-100 dark:border-indigo-900/30 flex items-center gap-2">
              <Link2 size={11} className="text-indigo-400 flex-shrink-0" />
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex-1">
                {selected.size} subsidiar{selected.size === 1 ? 'y' : 'ies'} selected
              </span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-indigo-400 hover:text-indigo-600"
              >
                <XCircle size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-neutral-800 flex gap-2">
          {createMutation.isError && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 mb-2">
              <AlertCircle size={11} /> Failed to create group. Please try again.
            </div>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-neutral-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!canCreate || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="flex-[2] flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            {createMutation.isPending
              ? <><Loader2 size={13} className="animate-spin" /> Creating…</>
              : <><Check size={13} /> Create{selected.size > 0 ? ` + Link ${selected.size}` : ''}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
