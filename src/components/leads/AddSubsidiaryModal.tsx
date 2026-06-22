'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Search, Loader2, Check, AlertCircle, Plus,
  Building2, Globe, Link2, UserPlus, ArrowLeft, Play,
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
  sql:           'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  mql:           'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
  qualification: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
  enrichment:    'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
  contact:       'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  research:      'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  discovery:     'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
  needs_review:  'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  disqualified:  'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400',
}

export default function AddSubsidiaryModal({ group, onClose, onDone }: Props) {
  const [search,           setSearch]           = useState('')
  const [searchDebounced,  setSearchDebounced]  = useState('')
  const [showCreate,       setShowCreate]       = useState(false)
  const [newName,          setNewName]          = useState('')
  const [newDomain,        setNewDomain]        = useState('')
  // leads returned by pre-create check — null = not yet checked
  const [reviewing,        setReviewing]        = useState<SearchLead[] | null>(null)
  const [preCheckLoading,  setPreCheckLoading]  = useState(false)
  const [done,             setDone]             = useState<{ action: string; company_name: string } | null>(null)

  const qc  = useQueryClient()
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 280)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (showCreate && !newName) setNewName(search)
  }, [showCreate])

  // ── Search existing leads ──────────────────────────────────────────────────
  const { data: results, isFetching } = useQuery({
    queryKey: ['leads-search-subsidiary', searchDebounced],
    queryFn: () =>
      api.get('/leads', { params: { search: searchDebounced, page_size: 10 } })
        .then(r => (r.data?.leads ?? []) as SearchLead[]),
    enabled: searchDebounced.length >= 2,
    staleTime: 20_000,
  })

  // ── Link existing lead (user confirmed) ───────────────────────────────────
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

  // ── Re-run pipeline on an existing lead ───────────────────────────────────
  const rerunMutation = useMutation({
    mutationFn: (leadId: string) =>
      api.post(`/leads/${leadId}/run`).then(r => r.data),
    onSuccess: (_, leadId) => {
      const lead = reviewing?.find(l => l.id === leadId)
      qc.invalidateQueries({ queryKey: ['group-members', group.id] })
      setDone({ action: 'rerun', company_name: lead?.company_name ?? '' })
    },
  })

  // Strip URL cruft from a domain input: https://example.com/path → example.com
  const normalizeDomain = (raw: string): string =>
    raw.trim().replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].toLowerCase()

  // ── Pre-create check: search before creating to surface existing matches ──
  const handlePreCreate = async () => {
    if (!newName.trim()) return
    setPreCheckLoading(true)
    const cleanDomain = newDomain.trim() ? normalizeDomain(newDomain) : ''
    try {
      const byName = await api.get('/leads', {
        params: { search: newName.trim(), page_size: 8 },
      }).then(r => (r.data?.leads ?? []) as SearchLead[])

      let byDomain: SearchLead[] = []
      if (cleanDomain) {
        byDomain = await api.get('/leads', {
          params: { search: cleanDomain, page_size: 8 },
        }).then(r => (r.data?.leads ?? []) as SearchLead[])
      }

      const seen = new Set<string>()
      const merged = [...byName, ...byDomain].filter(l => {
        if (seen.has(l.id)) return false
        seen.add(l.id)
        return true
      })

      if (merged.length > 0) {
        setReviewing(merged)
      } else {
        addMutation.mutate({ name: newName.trim(), domain: cleanDomain || undefined })
      }
    } catch {
      addMutation.mutate({ name: newName.trim(), domain: cleanDomain || undefined })
    } finally {
      setPreCheckLoading(false)
    }
  }

  const actionLabel: Record<string, string> = {
    linked:  'Linked — pipeline dispatched from current stage',
    created: 'Created — full pipeline starting now',
    rerun:   'Pipeline re-run dispatched',
  }

  // ── Review screen ──────────────────────────────────────────────────────────
  if (reviewing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReviewing(null)}
                className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              >
                <ArrowLeft size={14} />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-800 dark:text-slate-200">
                  Company found in system
                </p>
                <p className="text-xs text-neutral-400 dark:text-slate-500 truncate">
                  Review before adding to {group.name}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-50 dark:divide-neutral-800/60">
            {reviewing.map(lead => {
              const inThisGroup  = lead.corporate_group?.id === group.id
              const inOtherGroup = lead.corporate_group && !inThisGroup
              const stageCls     = STAGE_COLOR[lead.lifecycle_stage] ?? 'bg-neutral-100 text-neutral-500'
              const isBusy       = addMutation.isPending || rerunMutation.isPending

              return (
                <div key={lead.id} className="flex items-center gap-3 px-4 py-3.5">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 shadow-sm overflow-hidden bg-white dark:bg-neutral-700">
                    <CompanyAvatar domain={lead.domain} name={lead.company_name} size="sm" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-slate-200 truncate">
                      {lead.company_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <p className="text-xs text-neutral-400 dark:text-slate-500 truncate">
                        {lead.domain || 'no domain'}
                      </p>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0', stageCls)}>
                        {lead.lifecycle_stage.replace(/_/g, ' ')}
                      </span>
                      {inOtherGroup && (
                        <span className="text-xs text-amber-500 dark:text-amber-400 shrink-0">
                          · in {lead.corporate_group!.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
                    {inThisGroup ? (
                      <>
                        <span className="text-xs text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Check size={10} /> Already linked
                        </span>
                        <button
                          onClick={() => rerunMutation.mutate(lead.id)}
                          disabled={isBusy}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium disabled:opacity-50 transition-colors"
                        >
                          {rerunMutation.isPending
                            ? <Loader2 size={10} className="animate-spin" />
                            : <Play size={10} />}
                          Re-run
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => addMutation.mutate({ lead_id: lead.id })}
                        disabled={isBusy}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 transition-colors"
                      >
                        {addMutation.isPending
                          ? <Loader2 size={10} className="animate-spin" />
                          : 'Link to group'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer — create anyway */}
          <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-xs text-neutral-400 dark:text-slate-500 mb-2.5">
              None of these? Create a fresh lead for <span className="font-medium text-neutral-600 dark:text-slate-300">{newName}</span>
            </p>
            <button
              onClick={() => {
                const cleanDomain = newDomain.trim() ? normalizeDomain(newDomain) : ''
                addMutation.mutate({
                  name:   newName.trim(),
                  domain: cleanDomain || undefined,
                })
              }}
              disabled={addMutation.isPending || rerunMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 disabled:opacity-50 transition-colors"
            >
              <Plus size={11} /> Create as new anyway
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main modal ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Link2 size={13} className="text-indigo-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800 dark:text-slate-200">Add Subsidiary</p>
              <p className="text-xs text-neutral-400 dark:text-slate-500 truncate">{group.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
            <X size={14} />
          </button>
        </div>

        {/* Success state */}
        {done ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-slate-200">{done.company_name}</p>
            <p className="text-xs text-neutral-400 dark:text-slate-500 text-center">{actionLabel[done.action] ?? 'Done'}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setDone(null); setSearch(''); setNewName(''); setNewDomain('')
                  setShowCreate(false); setReviewing(null)
                }}
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
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  ref={ref}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowCreate(false) }}
                  placeholder="Search existing leads by name or domain…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-neutral-700 dark:text-slate-300 placeholder:text-neutral-400"
                />
                {isFetching && (
                  <Loader2 size={11} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-neutral-400" />
                )}
              </div>
            </div>

            {/* Search results */}
            {searchDebounced.length >= 2 && (
              <div className="divide-y divide-neutral-50 dark:divide-neutral-800/60 border-t border-neutral-50 dark:border-neutral-800/60">
                {!isFetching && (results ?? []).length === 0 && (
                  <div className="py-4 px-4 text-xs text-neutral-400 dark:text-slate-500">
                    No existing leads match — use "Add company not in system" below
                  </div>
                )}
                {(results ?? []).map(lead => {
                  const inThisGroup  = lead.corporate_group?.id === group.id
                  const inOtherGroup = lead.corporate_group && !inThisGroup
                  return (
                    <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
                      <CompanyAvatar domain={lead.domain} name={lead.company_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-800 dark:text-slate-200 truncate">{lead.company_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <p className="text-xs text-neutral-400 dark:text-slate-500 truncate">{lead.domain}</p>
                          {inOtherGroup && (
                            <span className="text-xs text-amber-500 dark:text-amber-400 shrink-0">
                              · in {lead.corporate_group!.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lead.lifecycle_stage && (
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full font-medium capitalize',
                            STAGE_COLOR[lead.lifecycle_stage] ?? 'bg-neutral-100 text-neutral-500'
                          )}>
                            {lead.lifecycle_stage.replace(/_/g, ' ')}
                          </span>
                        )}
                        {inThisGroup ? (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-0.5">
                            <Check size={10} /> Linked
                          </span>
                        ) : (
                          <button
                            onClick={() => addMutation.mutate({ lead_id: lead.id })}
                            disabled={addMutation.isPending}
                            className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 transition-colors"
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
              <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
              <span className="text-xs text-neutral-400 dark:text-slate-500">or add new</span>
              <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
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
                  <label className="block text-xs font-medium text-neutral-500 dark:text-slate-400 mb-1">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Shorelines Casino Peterborough"
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-neutral-700 dark:text-slate-300 placeholder:text-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-slate-400 mb-1">
                    Domain <span className="text-neutral-300 dark:text-neutral-600">(optional)</span>
                  </label>
                  <div className="relative">
                    <Globe size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <input
                      value={newDomain}
                      onChange={e => setNewDomain(e.target.value)}
                      placeholder="shorelinescasinos.com"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-neutral-700 dark:text-slate-300 placeholder:text-neutral-400"
                    />
                  </div>
                </div>
                <p className="text-xs text-neutral-400 dark:text-slate-500">
                  We'll check for a matching company first. If one exists you'll review it before anything is linked or created. Paste a full URL or bare domain — both work.
                </p>
                {addMutation.isError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle size={11} /> Failed. Please try again.
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 text-xs text-neutral-500 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePreCreate}
                    disabled={!newName.trim() || preCheckLoading || addMutation.isPending}
                    className="flex-[2] flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
                  >
                    {preCheckLoading
                      ? <><Loader2 size={11} className="animate-spin" /> Checking…</>
                      : addMutation.isPending
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
