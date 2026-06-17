'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Search, Loader2, Check, AlertCircle, Plus,
  Building2, Globe, Link2, UserPlus,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import CompanyAvatar from './CompanyAvatar'

interface Group {
  id: string
  name: string
  root_domain: string
}

interface SearchLead {
  id: string
  company_name: string
  domain: string
  lifecycle_stage: string
  qualification_score: number | null
  corporate_group: { id: string; name: string } | null
}

interface Props {
  group: Group
  onClose: () => void
  onDone: () => void
}

const STAGE_COLOR: Record<string, string> = {
  sql:           'bg-emerald-50 text-emerald-600',
  mql:           'bg-teal-50 text-teal-600',
  qualification: 'bg-sky-50 text-sky-600',
  enrichment:    'bg-violet-50 text-violet-600',
  contact:       'bg-indigo-50 text-indigo-600',
  research:      'bg-blue-50 text-blue-600',
  discovery:     'bg-gray-100 text-gray-500',
  disqualified:  'bg-red-50 text-red-500',
}

export default function AddSubsidiaryModal({ group, onClose, onDone }: Props) {
  const [search,         setSearch]         = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [showCreate,     setShowCreate]     = useState(false)
  const [newName,        setNewName]        = useState('')
  const [newDomain,      setNewDomain]      = useState('')
  const [done,           setDone]           = useState<{ action: string; company_name: string } | null>(null)
  const qc  = useQueryClient()
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 280)
    return () => clearTimeout(t)
  }, [search])

  // Sync create name from search when showing create form
  useEffect(() => {
    if (showCreate && !newName) setNewName(search)
  }, [showCreate])

  const { data: results, isFetching } = useQuery({
    queryKey: ['leads-search-subsidiary', searchDebounced],
    queryFn: () =>
      api.get('/leads', { params: { search: searchDebounced, page_size: 10 } })
        .then(r => (r.data?.leads ?? []) as SearchLead[]),
    enabled: searchDebounced.length >= 2,
    staleTime: 20_000,
  })

  const addMutation = useMutation({
    mutationFn: (body: { lead_id?: string; name?: string; domain?: string }) =>
      api.post(`/corporate-groups/${group.id}/add_subsidiary`, body).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['corporate-groups'] })
      qc.invalidateQueries({ queryKey: ['group-members', group.id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      setDone({ action: data.action, company_name: data.company_name })
    },
  })

  const handleLink = (lead: SearchLead) =>
    addMutation.mutate({ lead_id: lead.id })

  const handleCreate = () => {
    if (!newName.trim()) return
    addMutation.mutate({ name: newName.trim(), domain: newDomain.trim() || undefined })
  }

  const actionLabel: Record<string, string> = {
    linked:          'Linked — pipeline dispatched from current stage',
    linked_existing: 'Linked — pipeline dispatched from current stage',
    created:         'Created — full pipeline starting now',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Link2 size={13} className="text-indigo-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Add Subsidiary</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{group.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
            <X size={14} />
          </button>
        </div>

        {/* Success state */}
        {done ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{done.company_name}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center">{actionLabel[done.action] ?? 'Done'}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setDone(null); setSearch(''); setNewName(''); setNewDomain(''); setShowCreate(false) }}
                className="px-4 py-2 text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              >
                Add another
              </button>
              <button
                onClick={() => { onDone(); onClose() }}
                className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Search existing leads */}
            <div className="px-4 pt-4 pb-3">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={ref}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowCreate(false) }}
                  placeholder="Search existing leads by name or domain…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-xl outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-700 dark:text-slate-300 placeholder:text-gray-400"
                />
                {isFetching && (
                  <Loader2 size={11} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>
            </div>

            {/* Search results */}
            {searchDebounced.length >= 2 && (
              <div className="divide-y divide-gray-50 dark:divide-neutral-800/60 border-t border-gray-50 dark:border-neutral-800/60">
                {!isFetching && (results ?? []).length === 0 && (
                  <div className="py-4 px-4 text-xs text-gray-400 dark:text-slate-500">
                    No existing leads match — use "Create new" below
                  </div>
                )}
                {(results ?? []).map(lead => {
                  const alreadyInThisGroup = lead.corporate_group?.id === group.id
                  return (
                    <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
                      <CompanyAvatar domain={lead.domain} name={lead.company_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{lead.company_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{lead.domain}</p>
                          {lead.corporate_group && !alreadyInThisGroup && (
                            <span className="text-[10px] text-amber-500 dark:text-amber-400 flex-shrink-0">
                              · in {lead.corporate_group.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lead.lifecycle_stage && (
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                            STAGE_COLOR[lead.lifecycle_stage] ?? 'bg-gray-100 text-gray-500'
                          )}>
                            {lead.lifecycle_stage.replace(/_/g, ' ')}
                          </span>
                        )}
                        {alreadyInThisGroup ? (
                          <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5">
                            <Check size={10} /> Linked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleLink(lead)}
                            disabled={addMutation.isPending}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 transition-colors"
                          >
                            {addMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : 'Link'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Divider */}
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800" />
              <span className="text-[11px] text-gray-400 dark:text-slate-500">or create new</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800" />
            </div>

            {/* Create new section */}
            {!showCreate ? (
              <div className="px-4 pb-4">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                >
                  <UserPlus size={13} />
                  Add company not in system
                </button>
              </div>
            ) : (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Mohegan Sun"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-xl outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-700 dark:text-slate-300 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Domain <span className="text-gray-300 dark:text-neutral-600">(optional — helps but not required)</span>
                  </label>
                  <div className="relative">
                    <Globe size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      value={newDomain}
                      onChange={e => setNewDomain(e.target.value)}
                      placeholder="mohegansun.com"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-xl outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-700 dark:text-slate-300 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-500">
                  We'll run the full pipeline — contacts, enrichment, and intel — for this company.
                  Existing contacts from {group.name} are passed as context so we won't re-spend Hunter / ZeroBounce on known people.
                </p>
                {addMutation.isError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle size={11} /> Failed. Please try again.
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 text-xs text-gray-500 border border-gray-200 dark:border-neutral-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || addMutation.isPending}
                    className="flex-[2] flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
                  >
                    {addMutation.isPending
                      ? <><Loader2 size={11} className="animate-spin" /> Creating…</>
                      : <><Plus size={11} /> Create + Run Pipeline</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
