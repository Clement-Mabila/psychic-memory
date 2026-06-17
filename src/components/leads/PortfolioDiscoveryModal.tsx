'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Building2, Globe, ChevronRight, Check, AlertCircle,
  Loader2, Link2, PlusCircle, Users, Search, XCircle,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KnownLead {
  id: string
  company_name: string
  domain: string
  lifecycle_stage: string
  qualification_score: number | null
  contacts?: { name: string; title: string; email: string | null }[]
}

interface KnownContact {
  name: string
  title: string
  email: string
  verified: boolean
  linkedin: string
}

interface ExistingLead {
  id: string
  company_name: string
  stage: string
  score: number
  contact_count: number
  contacts: KnownContact[]
}

interface DiscoveredProperty {
  name: string
  domain: string
  location?: string | null
  country?: string | null
  province_state?: string | null
  confidence: number
  match_type: 'exact' | 'fuzzy' | 'none'
  existing_lead?: ExistingLead | null
}

interface PreviewResult {
  parent_name: string
  parent_domain: string
  properties: DiscoveredProperty[]
}

interface ConfirmResult {
  group_id: string
  group_name: string
  linked_count: number
  new_signals: { domain: string; signal_id: string }[]
}

interface Props {
  onClose: () => void
}

type Step = 'input' | 'preview' | 'success'

// ── Company search pill selector ───────────────────────────────────────────────

function CompanySearch({
  selected,
  onAdd,
  onRemove,
}: {
  selected: KnownLead[]
  onAdd: (lead: KnownLead) => void
  onRemove: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['leads-search', debouncedQ],
    queryFn: () =>
      api.get('/leads/', { params: { search: debouncedQ, page_size: 10, page: 1 } })
        .then(r => (r.data?.leads ?? []) as KnownLead[]),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  })

  const results: KnownLead[] = (data ?? []).filter(l => !selected.some(s => s.id === l.id))

  return (
    <div ref={wrapRef} className="space-y-2">
      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(lead => (
            <span
              key={lead.id}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium rounded-lg border border-indigo-200 dark:border-indigo-800"
            >
              <Building2 size={9} className="flex-shrink-0" />
              {lead.company_name}
              <button
                onClick={() => onRemove(lead.id)}
                className="ml-0.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
              >
                <XCircle size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { if (q.length >= 2) setOpen(true) }}
          placeholder="Search by company name…"
          className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500"
        />

        {/* Dropdown */}
        {open && debouncedQ.length >= 2 && (
          <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden">
            {isLoading && (
              <div className="py-4 text-center text-xs text-gray-400 dark:text-slate-500">
                <Loader2 size={12} className="inline animate-spin mr-1" />Searching…
              </div>
            )}
            {!isLoading && results.length === 0 && (
              <div className="py-4 text-center text-xs text-gray-400 dark:text-slate-500">
                No matching companies in the system
              </div>
            )}
            {results.map(lead => (
              <button
                key={lead.id}
                onClick={() => { onAdd(lead); setQ(''); setOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 size={11} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{lead.company_name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{lead.domain}</p>
                </div>
                <span className="text-[10px] text-gray-300 dark:text-neutral-600 flex-shrink-0 capitalize">
                  {lead.lifecycle_stage?.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function PortfolioDiscoveryModal({ onClose }: Props) {
  const [step, setStep]                 = useState<Step>('input')
  const [parentDomain, setParentDomain] = useState('')
  const [knownLeads, setKnownLeads]     = useState<KnownLead[]>([])
  const [preview, setPreview]           = useState<PreviewResult | null>(null)
  const [selectedNew, setSelectedNew]   = useState<Set<string>>(new Set())
  const [runCorpContacts, setRunCorpContacts] = useState(true)
  const [confirmed, setConfirmed]       = useState<ConfirmResult | null>(null)
  const qc = useQueryClient()

  const addKnown = (lead: KnownLead) =>
    setKnownLeads(prev => prev.some(l => l.id === lead.id) ? prev : [...prev, lead])
  const removeKnown = (id: string) =>
    setKnownLeads(prev => prev.filter(l => l.id !== id))

  const previewMutation = useMutation({
    mutationFn: (domain: string) =>
      api.post('/corporate-groups/portfolio_preview', {
        parent_domain:  domain,
        known_lead_ids: knownLeads.map(l => l.id),
      }).then(r => r.data as PreviewResult),
    onSuccess: (data) => {
      setPreview(data)
      setSelectedNew(new Set(
        data.properties.filter(p => p.match_type === 'none').map(p => p.domain)
      ))
      setStep('preview')
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!preview) return Promise.reject(new Error('No preview'))
      const existingLeadIds = preview.properties
        .filter(p => p.match_type !== 'none' && p.existing_lead)
        .map(p => p.existing_lead!.id)
      return api.post('/corporate-groups/portfolio_confirm', {
        parent_domain:          preview.parent_domain,
        parent_name:            preview.parent_name,
        existing_lead_ids:      existingLeadIds,
        new_property_domains:   Array.from(selectedNew),
        run_corporate_contacts: runCorpContacts,
      }).then(r => r.data as ConfirmResult)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['leads-kanban'] })
      qc.invalidateQueries({ queryKey: ['corporate-groups'] })
      setConfirmed(data)
      setStep('success')
    },
  })

  const existingProps = preview?.properties.filter(p => p.match_type !== 'none') ?? []
  const newProps      = preview?.properties.filter(p => p.match_type === 'none') ?? []

  const toggleNew = (dom: string) =>
    setSelectedNew(prev => {
      const next = new Set(prev)
      next.has(dom) ? next.delete(dom) : next.add(dom)
      return next
    })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-indigo-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Portfolio Discovery</p>
            {step === 'preview' && <span className="text-[11px] text-gray-400 dark:text-slate-500 ml-1">— Review</span>}
            {step === 'success' && <span className="text-[11px] text-green-500 ml-1">— Done</span>}
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
            <X size={14} />
          </button>
        </div>

        {/* ── Step 1: Input ─────────────────────────────────────────── */}
        {step === 'input' && (
          <div className="flex flex-col gap-5 p-5">

            {/* Parent domain */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">
                Parent Company Domain
              </label>
              <input
                autoFocus
                value={parentDomain}
                onChange={e => setParentDomain(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && parentDomain.trim()) previewMutation.mutate(parentDomain.trim()) }}
                placeholder="e.g. mohegangaming.com"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Known subsidiaries search */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">
                Subsidiaries already in the system
                <span className="ml-1 text-gray-400 dark:text-neutral-600 font-normal">(optional — helps agent skip known contacts)</span>
              </label>
              <CompanySearch
                selected={knownLeads}
                onAdd={addKnown}
                onRemove={removeKnown}
              />
            </div>

            {previewMutation.isError && (
              <div className="flex items-center gap-2 text-xs text-red-500">
                <AlertCircle size={12} />
                <span>
                  {(previewMutation.error as any)?.response?.data?.detail ?? 'Discovery failed. Check the domain and try again.'}
                </span>
              </div>
            )}

            <button
              disabled={!parentDomain.trim() || previewMutation.isPending}
              onClick={() => previewMutation.mutate(parentDomain.trim())}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {previewMutation.isPending ? (
                <><Loader2 size={13} className="animate-spin" /> Discovering…</>
              ) : (
                <><ChevronRight size={13} /> Discover Properties</>
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Preview ───────────────────────────────────────── */}
        {step === 'preview' && preview && (
          <>
            {/* Parent summary */}
            <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Building2 size={13} className="text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{preview.parent_name}</p>
                  <p className="text-[11px] text-indigo-400">{preview.parent_domain}</p>
                </div>
                <div className="ml-auto flex gap-3 text-[11px] text-indigo-400">
                  <span className="flex items-center gap-1"><Link2 size={9} /> {existingProps.length} existing</span>
                  <span className="flex items-center gap-1"><PlusCircle size={9} /> {newProps.length} new</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-neutral-800/60">
              {/* Existing leads */}
              {existingProps.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-800/50">
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                      Existing Leads — will be linked to group
                    </p>
                  </div>
                  {existingProps.map(prop => (
                    <div key={prop.domain} className="px-4 py-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} className="text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">
                            {prop.existing_lead?.company_name ?? prop.name}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{prop.domain}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className={cn(
                            'text-[10px] px-1.5 py-px rounded',
                            prop.match_type === 'exact'
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                          )}>
                            {prop.match_type}
                          </span>
                          {prop.existing_lead && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-slate-500">
                              <Users size={8} /> {prop.existing_lead.contact_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Known contacts — won't be re-enriched */}
                      {(prop.existing_lead?.contacts ?? []).length > 0 && (
                        <div className="ml-8 space-y-1">
                          {prop.existing_lead!.contacts.map((c, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-600 flex-shrink-0" />
                              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                                {c.name}
                                {c.title && <span className="text-gray-400 dark:text-slate-500"> · {c.title}</span>}
                              </p>
                              {c.email && (
                                <span className={cn(
                                  'ml-auto text-[10px] flex-shrink-0',
                                  c.verified
                                    ? 'text-green-500 dark:text-green-400'
                                    : 'text-gray-300 dark:text-neutral-600'
                                )}>
                                  {c.verified ? '✓' : '?'} email
                                </span>
                              )}
                            </div>
                          ))}
                          <p className="text-[10px] text-gray-300 dark:text-neutral-600 italic ml-3">
                            won't re-spend Hunter / ZeroBounce
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* New properties */}
              {newProps.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-800/50">
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                      New Properties — select to ingest
                    </p>
                  </div>
                  {newProps.map(prop => {
                    const checked = selectedNew.has(prop.domain)
                    return (
                      <button
                        key={prop.domain}
                        onClick={() => toggleNew(prop.domain)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                          checked
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-gray-300 dark:border-neutral-600 bg-white dark:bg-zinc-800'
                        )}>
                          {checked && <Check size={10} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{prop.name}</p>
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{prop.domain}</p>
                          {prop.location && (
                            <p className="text-[11px] text-gray-400 dark:text-slate-500">{prop.location}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {existingProps.length === 0 && newProps.length === 0 && (
                <div className="py-10 text-center text-xs text-gray-400 dark:text-slate-500">
                  No properties discovered. Try a different parent domain.
                </div>
              )}
            </div>

            {/* Options + confirm footer */}
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-neutral-800 px-4 py-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRunCorpContacts(v => !v)}
                  className={cn(
                    'w-8 h-4 rounded-full transition-colors flex-shrink-0 cursor-pointer',
                    runCorpContacts ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-neutral-700'
                  )}
                >
                  <div className={cn(
                    'w-3 h-3 bg-white rounded-full shadow mt-0.5 transition-transform',
                    runCorpContacts ? 'translate-x-[18px]' : 'translate-x-0.5'
                  )} />
                </div>
                <span className="text-xs text-gray-600 dark:text-slate-400">
                  Find corporate contacts at {preview.parent_domain}
                </span>
              </label>

              {confirmMutation.isError && (
                <div className="flex items-center gap-2 text-xs text-red-500">
                  <AlertCircle size={12} /> <span>Confirm failed. Please try again.</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-2 text-xs text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-neutral-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={confirmMutation.isPending || (existingProps.length === 0 && selectedNew.size === 0)}
                  onClick={() => confirmMutation.mutate()}
                  className="flex-[2] flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {confirmMutation.isPending ? (
                    <><Loader2 size={13} className="animate-spin" /> Confirming…</>
                  ) : (
                    <>
                      <Check size={13} />
                      Confirm{selectedNew.size > 0 && ` (${selectedNew.size} new)`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Success ───────────────────────────────────────── */}
        {step === 'success' && confirmed && (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <Check size={22} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{confirmed.group_name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Group created / updated</p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{confirmed.linked_count}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">existing leads linked</p>
              </div>
              <div className="w-px bg-gray-100 dark:bg-neutral-800" />
              <div>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{confirmed.new_signals.length}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">new properties queued</p>
              </div>
            </div>
            {confirmed.new_signals.length > 0 && (
              <p className="text-[11px] text-gray-400 dark:text-slate-500 max-w-xs">
                New properties entered the pipeline. Existing contacts are shared as context — Hunter + ZeroBounce only runs for contacts not already in the system.
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
