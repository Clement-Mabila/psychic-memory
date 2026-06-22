'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight,
  Search, LayoutGrid, Table2, Network,
  ListFilter, Check, X, Globe, PlusCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import LeadCard from '@/components/leads/LeadCard'
import LeadTable from '@/components/leads/LeadTable'
import GroupPickerModal from '@/components/leads/GroupPickerModal'
import PortfolioDiscoveryModal from '@/components/leads/PortfolioDiscoveryModal'
import GroupKanbanView from '@/components/leads/GroupKanbanView'
import GroupTableView from '@/components/leads/GroupTableView'
import CreateGroupModal from '@/components/leads/CreateGroupModal'
import LeadDetailModal from '@/components/leads/LeadDetailModal'

const STAGES = [
  'raw_signal','discovery','research','contact',
  'enrichment','qualification','sql','mql','needs_review','disqualified',
]
const VERTICALS = ['casino','airport','hospital','transit','mall']

const RERUN_OPTIONS = [
  { value: 'research',      label: 'Re-run from Research' },
  { value: 'contact',       label: 'Re-run from Contact' },
  { value: 'enrichment',    label: 'Re-run from Enrichment' },
  { value: 'qualification', label: 'Re-run Qualification only' },
]

type ViewMode = 'kanban' | 'table' | 'groups'

const VIEW_TABS: { id: ViewMode; label: string; Icon: any }[] = [
  { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
  { id: 'table',  label: 'Table',  Icon: Table2 },
  { id: 'groups', label: 'Groups', Icon: Network },
]

// ─── Collapsible search ──────────────────────────────────────────────────────
function CollapsibleSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  const expand = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const handleBlur = () => {
    closeTimer.current = setTimeout(() => { setExpanded(false); onChange(''); closeTimer.current = null }, 5000)
  }
  const handleFocus = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }

  if (!expanded) {
    return (
      <button onClick={expand} className="h-9 w-9 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      </button>
    )
  }
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      <input
        ref={inputRef}
        placeholder="Search company or domain…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="w-64 pl-9 pr-3 h-10 text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 focus:border-slate-300 dark:focus:border-slate-600 rounded-full placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-600 dark:text-slate-300 outline-none"
      />
    </div>
  )
}

// ─── Filters dropdown ────────────────────────────────────────────────────────
function FiltersButton({
  vertical, stage, hasGroup, view,
  onVertical, onStage, onHasGroup, onClear,
}: {
  vertical: string; stage: string; hasGroup: string; view: string
  onVertical: (v: string) => void
  onStage: (s: string) => void
  onHasGroup: (v: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeCount = (vertical ? 1 : 0) + (stage ? 1 : 0) + (hasGroup ? 1 : 0)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'relative h-9 w-9 rounded-2xl border flex items-center justify-center transition-colors',
          open ? 'bg-slate-900 dark:bg-zinc-700 border-slate-900 dark:border-slate-700 text-white' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        )}
      >
        <ListFilter className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-black/40 p-4 space-y-4">

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Filters</p>
            {activeCount > 0 && (
              <button onClick={onClear} className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Vertical */}
          <div>
            <p className="text-sm font-normal text-slate-700 dark:text-slate-300 mb-2">Vertical</p>
            <div className="flex flex-wrap gap-2">
              {VERTICALS.map(v => {
                const selected = vertical === v
                return (
                  <button
                    key={v}
                    onClick={() => { onVertical(selected ? '' : v) }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selected ? 'bg-slate-900 dark:bg-zinc-700 text-white border-slate-900' : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          {view !== 'kanban' && (
            <>
              <div className="border-b border-slate-100 dark:border-slate-800" />
              <div>
                <p className="text-sm font-normal text-slate-700 dark:text-slate-300 mb-2">Stage</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(s => {
                    const selected = stage === s
                    return (
                      <button
                        key={s}
                        onClick={() => { onStage(selected ? '' : s) }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          selected ? 'bg-slate-900 dark:bg-zinc-700 text-white border-slate-900' : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        )}
                      >
                        {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                        {s.replace(/_/g, ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div className="border-b border-slate-100 dark:border-slate-800" />
          <div>
            <p className="text-sm font-normal text-slate-700 dark:text-slate-300 mb-2">Corporate Group</p>
            <div className="flex gap-2">
              {(['true', 'false'] as const).map(val => {
                const label = val === 'true' ? 'Has group' : 'No group'
                const selected = hasGroup === val
                return (
                  <button
                    key={val}
                    onClick={() => onHasGroup(selected ? '' : val)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selected ? 'bg-slate-900 dark:bg-zinc-700 text-white border-slate-900' : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Kanban column config ────────────────────────────────────────────────────
const KANBAN_COLUMNS: { id: string; label: string; colour: string }[] = [
  { id: 'raw_signal',    label: 'Raw Signal',    colour: 'bg-gray-400'    },
  { id: 'qualification', label: 'Qualification', colour: 'bg-orange-400'  },
  { id: 'sql',           label: 'SQL',           colour: 'bg-emerald-50 dark:bg-emerald-950/400' },
  { id: 'mql',           label: 'MQL',           colour: 'bg-teal-500'    },
  { id: 'needs_review',  label: 'Needs Review',  colour: 'bg-yellow-400'  },
  { id: 'disqualified',  label: 'Disqualified',  colour: 'bg-red-400'     },
]

// ─── Kanban scrollable column ────────────────────────────────────────────────
function KanbanColumn({
  col, leads, loading,
  runStatus, onRun, onRerun, onRunOnly, isPendingRun, selected, onSelect, onOpen, onSetGroup,
}: {
  col: { id: string; label: string; colour: string }
  leads: any[]
  loading: boolean
  runStatus: Record<string, string>
  onRun: (id: string) => void
  onRerun: (id: string, from: string) => void
  onRunOnly: (id: string, agentType: string) => void
  isPendingRun: (id: string) => boolean
  selected: Set<string>
  onSelect: (id: string) => void
  onOpen: (id: string) => void
  onSetGroup: (id: string) => void
}) {
  const [limit, setLimit] = useState(15)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)

  const visibleLeads = leads.slice(0, limit)
  const hasMore = leads.length > limit

  // Reset to 15 whenever the filtered lead list changes
  useEffect(() => { setLimit(15) }, [leads])

  // Load more when the sentinel div scrolls into view inside the column
  useEffect(() => {
    const sentinel = sentinelRef.current
    const root     = scrollRef.current
    if (!sentinel || !root || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLimit(prev => Math.min(prev + 25, leads.length))
      },
      { root, threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, leads.length])

  return (
    <div className="flex-shrink-0 w-[260px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn('w-2 h-2 rounded-full', col.colour)} />
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{col.label}</span>
        <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">{leads.length}</span>
        <button className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-400 dark:text-slate-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>

      {/* Scrollable card list + bottom fade */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 animate-pulse h-32" />
          ) : visibleLeads.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center text-xs text-gray-400 dark:text-slate-500">
              No leads
            </div>
          ) : (
            <>
              {visibleLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  runStatus={runStatus[lead.id]}
                  isRunning={isPendingRun(lead.id)}
                  onRun={onRun}
                  onRerun={onRerun}
                  onRunOnly={onRunOnly}
                  selected={selected.has(lead.id)}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onSetGroup={onSetGroup}
                />
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="h-6 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">{leads.length - limit} more</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fade gradient when more cards are below the scroll viewport */}
        {hasMore && (
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-gray-50 dark:from-slate-950 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const qc = useQueryClient()
  const [view,          setView]          = useState<ViewMode>('kanban')
  const [groupViewMode, setGroupViewMode] = useState<'kanban' | 'table'>('kanban')
  const [search,   setSearch]   = useState('')
  const [vertical, setVertical] = useState('')
  const [stage,    setStage]    = useState('')
  const [hasGroup, setHasGroup] = useState('')
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [runStatus, setRunStatus] = useState<Record<string, string>>({})
  const [groupPickerLeadId,  setGroupPickerLeadId]  = useState<string | null>(null)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [showCreateGroup,    setShowCreateGroup]     = useState(false)
  const [detailLeadId,       setDetailLeadId]        = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, vertical, stage, hasGroup, page],
    queryFn: () =>
      api.get('/leads/', { params: { search, vertical, stage, has_corporate_group: hasGroup || undefined, page } }).then(r => r.data),
    placeholderData: prev => prev,
    enabled: view !== 'kanban',
  })

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ['leads-kanban', search, vertical, hasGroup],
    queryFn: () =>
      api.get('/leads/', { params: { search, vertical, has_corporate_group: hasGroup || undefined, page_size: 500, page: 1 } }).then(r => r.data),
    placeholderData: prev => prev,
    enabled: view === 'kanban',
    staleTime: 30_000,
  })

  const leads: any[] = data?.leads ?? []
  const kanbanLeads: any[] = kanbanData?.leads ?? []

  const clearStatus = (id: string) =>
    setTimeout(() => setRunStatus(s => { const n = { ...s }; delete n[id]; return n }), 8000)

  const runMutation = useMutation({
    mutationFn: (leadId: string) => api.post(`/leads/${leadId}/run/`),
    onSuccess: (res, leadId) => {
      setRunStatus(s => ({ ...s, [leadId]: `Dispatched → ${res.data.dispatched}` }))
      clearStatus(leadId)
    },
    onError: (_, leadId) => {
      setRunStatus(s => ({ ...s, [leadId]: 'Error' }))
      clearStatus(leadId)
    },
  })

  const rerunMutation = useMutation({
    mutationFn: ({ leadId, from }: { leadId: string; from: string }) =>
      api.post(`/leads/${leadId}/rerun/`, { from }),
    onSuccess: (res, { leadId }) => {
      setRunStatus(s => ({ ...s, [leadId]: `Re-running from ${res.data.from}` }))
      clearStatus(leadId)
    },
  })

  const runOnlyMutation = useMutation({
    mutationFn: ({ leadId, agentType }: { leadId: string; agentType: string }) =>
      api.post(`/leads/${leadId}/run_only/`, { agent_type: agentType }),
    onSuccess: (res, { leadId }) => {
      setRunStatus(s => ({ ...s, [leadId]: `Running ${res.data.agent_type} only…` }))
      clearStatus(leadId)
    },
    onError: (_, { leadId }) => {
      setRunStatus(s => ({ ...s, [leadId]: 'Error' }))
      clearStatus(leadId)
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (action: string) =>
      api.post('/leads/bulk/', { lead_ids: Array.from(selected), action }),
    onSuccess: res => {
      alert(`Dispatched ${res.data.dispatched} leads`)
      setSelected(new Set())
    },
  })

  const toggleSelect = (id: string) =>
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(leads.map((l: any) => l.id)) : new Set())

  // Group leads by stage for Kanban — uses its own full dataset, not the paginated table slice
  const byStage = KANBAN_COLUMNS.reduce<Record<string, any[]>>((acc, col) => {
    acc[col.id] = kanbanLeads.filter(l => l.lifecycle_stage === col.id)
    return acc
  }, {})

  return (
    <div className="p-7">
      {/* Header */}

      {/* View switcher + filters row — matches image exactly */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        {/* Left: view tabs */}
        <div className="flex items-center border-none rounded-xl overflow-hidden  p-0.5 gap-0.5">
          {VIEW_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                view === id
                  ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-slate-100'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}

          {view === 'groups' && (
            <>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
              {(['kanban', 'table'] as const).map(m => {
                const Icon = m === 'kanban' ? LayoutGrid : Table2
                return (
                  <button
                    key={m}
                    onClick={() => setGroupViewMode(m)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                      groupViewMode === m
                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-slate-100'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon size={14} />
                    {m === 'kanban' ? 'Board' : 'Table'}
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* Right: search + filters */}
        <div className="flex items-center gap-2">
          {view === 'groups' && (
            <button
              onClick={() => setShowCreateGroup(true)}
              title="New Parent Company"
              className="h-9 w-9 rounded-2xl bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center transition-colors"
            >
              <PlusCircle className="h-4 w-4 text-white" />
            </button>
          )}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => setShowPortfolioModal(true)}
            title="Portfolio Discovery"
            className="h-9 w-9 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <CollapsibleSearch value={search} onChange={v => { setSearch(v); setPage(1) }} />
          <FiltersButton
            vertical={vertical} stage={stage} hasGroup={hasGroup} view={view}
            onVertical={v => { setVertical(v); setPage(1) }}
            onStage={s => { setStage(s); setPage(1) }}
            onHasGroup={v => { setHasGroup(v); setPage(1) }}
            onClear={() => { setVertical(''); setStage(''); setHasGroup(''); setPage(1) }}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 flex items-center gap-3">
          <span className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <select
            className="h-7 px-2 border border-indigo-300 dark:border-indigo-700 rounded-md text-xs text-indigo-700 dark:text-indigo-400 bg-white dark:bg-zinc-900 outline-none"
            id="bulk-action"
          >
            <option value="run">Run pipeline</option>
            {RERUN_OPTIONS.map(o => (
              <option key={o.value} value={`rerun_${o.value}`}>{o.label}</option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            loading={bulkMutation.isPending}
            onClick={() => {
              const el = document.getElementById('bulk-action') as HTMLSelectElement
              bulkMutation.mutate(el.value)
            }}
          >
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Deselect
          </Button>
        </div>
      )}

      {/* ── KANBAN VIEW ──────────────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {KANBAN_COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              leads={byStage[col.id] ?? []}
              loading={kanbanLoading}
              runStatus={runStatus}
              onRun={id => runMutation.mutate(id)}
              onRerun={(id, from) => rerunMutation.mutate({ leadId: id, from })}
              onRunOnly={(id, agentType) => runOnlyMutation.mutate({ leadId: id, agentType })}
              isPendingRun={id => runMutation.isPending && runMutation.variables === id}
              selected={selected}
              onSelect={toggleSelect}
              onOpen={id => setDetailLeadId(id)}
              onSetGroup={id => setGroupPickerLeadId(id)}
            />
          ))}
        </div>
      )}

      {/* ── TABLE VIEW ───────────────────────────────────────────────────────── */}
      {view === 'table' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 overflow-hidden">
          <LeadTable
            leads={leads}
            isLoading={isLoading}
            selected={selected}
            onToggleAll={toggleAll}
            onToggleSelect={toggleSelect}
            runStatus={runStatus}
            isRunning={id => runMutation.isPending && runMutation.variables === id}
            onRun={id => runMutation.mutate(id)}
            onRerun={(id, from) => rerunMutation.mutate({ leadId: id, from })}
            onRunOnly={(id, agentType) => runOnlyMutation.mutate({ leadId: id, agentType })}
            onOpen={id => setDetailLeadId(id)}
            onSetGroup={id => setGroupPickerLeadId(id)}
          />
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {leads.length} leads{data?.total ? ` of ${data.total}` : ''}
            </span>
            {(data?.total_pages ?? 0) > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
                  {page} / {data?.total_pages}
                </span>
                <Button variant="ghost" size="sm" disabled={page >= (data?.total_pages ?? 1)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GROUPS VIEW ──────────────────────────────────────────────────────── */}
      {view === 'groups' && groupViewMode === 'kanban' && (
        <GroupKanbanView
          search={search}
          onOpen={id => setDetailLeadId(id)}
          onSetGroup={id => setGroupPickerLeadId(id)}
        />
      )}
      {view === 'groups' && groupViewMode === 'table' && (
        <GroupTableView
          search={search}
          onOpen={id => setDetailLeadId(id)}
          onSetGroup={id => setGroupPickerLeadId(id)}
        />
      )}

      {/* ── LIST VIEW (kept for data parity, hidden in nav) ───────────────────── */}
      {false && (
        <div className="flex flex-col gap-2">
          {isLoading && (
            <div className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">Loading…</div>
          )}
          {leads.map(lead => (
            <div
              key={lead.id}
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(lead.id)}
                onChange={() => toggleSelect(lead.id)}
                className="cursor-pointer flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{lead.company_name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">{lead.domain}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {lead.vertical && (
                  <span className={cn('text-[11px] font-medium px-2.5 py-0.5 rounded-full', 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-slate-400')}>
                    {lead.vertical}
                  </span>
                )}
                {lead.lifecycle_stage && (
                  <span className={cn('text-[11px] font-medium px-2.5 py-0.5 rounded-full', 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-slate-400')}>
                    {lead.lifecycle_stage.replace(/_/g, ' ')}
                  </span>
                )}
                {lead.qualification_score != null && (
                  <span className={cn(
                    'text-sm font-bold',
                    lead.qualification_score >= 55 ? 'text-emerald-600 dark:text-emerald-400'
                    : lead.qualification_score >= 30 ? 'text-amber-500 dark:text-amber-400'
                    : 'text-red-500 dark:text-red-400'
                  )}>
                    {lead.qualification_score}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {lead.modified ? require('@/lib/utils').formatRelativeTime(lead.modified) : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={runMutation.isPending && runMutation.variables === lead.id}
                  onClick={() => runMutation.mutate(lead.id)}
                >
                  Run
                </Button>
              </div>
            </div>
          ))}
          {!isLoading && leads.length === 0 && (
            <div className="text-sm text-gray-400 dark:text-slate-500 py-10 text-center">No leads match your filters</div>
          )}
          {(data?.total_pages ?? 0) > 1 && (
            <div className="flex items-center justify-between px-1 py-2">
              <span className="text-xs text-gray-400 dark:text-slate-500">Showing {leads.length} of {data?.total}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-gray-500 dark:text-slate-400 px-2">Page {page} of {data?.total_pages}</span>
                <Button variant="ghost" size="sm" disabled={page >= (data?.total_pages ?? 1)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Portfolio discovery modal ────────────────────────────────────────── */}
      {showPortfolioModal && (
        <PortfolioDiscoveryModal onClose={() => setShowPortfolioModal(false)} />
      )}

      {/* ── Create parent company modal ──────────────────────────────────────── */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => setShowCreateGroup(false)}
        />
      )}

      {/* ── Group picker modal ───────────────────────────────────────────────── */}
      {groupPickerLeadId && (() => {
        const allLeads = [...leads, ...kanbanLeads]
        const lead = allLeads.find((l: any) => l.id === groupPickerLeadId)
        return (
          <GroupPickerModal
            leadId={groupPickerLeadId}
            currentGroup={lead?.corporate_group ?? null}
            onClose={() => setGroupPickerLeadId(null)}
            onSaved={() => setGroupPickerLeadId(null)}
          />
        )
      })()}

      {/* ── Lead detail modal ────────────────────────────────────────────────── */}
      {detailLeadId && (
        <LeadDetailModal
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
          onRun={id => { runMutation.mutate(id); setDetailLeadId(null) }}
          onRerun={(id, from) => { rerunMutation.mutate({ leadId: id, from }); setDetailLeadId(null) }}
          onRunOnly={(id, agentType) => { runOnlyMutation.mutate({ leadId: id, agentType }); setDetailLeadId(null) }}
        />
      )}

    </div>
  )
}