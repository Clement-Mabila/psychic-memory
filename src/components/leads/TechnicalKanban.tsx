'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EyeOff, Eye, MoreVertical, Info } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import LeadCard from './LeadCard'
import LeadDetailModal from './LeadDetailModal'
import GroupPickerModal from './GroupPickerModal'

const RERUN_OPTIONS = [
  { value: 'research',      label: 'Re-run from Research'      },
  { value: 'contact',       label: 'Re-run from Contact'       },
  { value: 'enrichment',    label: 'Re-run from Enrichment'    },
  { value: 'qualification', label: 'Re-run Qualification only' },
]

export const KANBAN_COLUMNS = [
  { id: 'raw_signal',    label: 'Raw Signal',    dealLabel: 'Prospecting',        colour: 'bg-gray-400',   textColour: 'text-slate-400'  },
  { id: 'qualification', label: 'Qualification', dealLabel: 'Qualifying To Buy',  colour: 'bg-orange-500', textColour: 'text-orange-400' },
  { id: 'sql',           label: 'SQL',           dealLabel: 'Sales Qualified',    colour: 'bg-cyan-600',   textColour: 'text-emerald-500'},
  { id: 'mql',           label: 'MQL',           dealLabel: 'Market Qualified',   colour: 'bg-violet-600', textColour: 'text-violet-500' },
  { id: 'needs_review',  label: 'Needs Review',  dealLabel: 'Pending Review',     colour: 'bg-amber-600',  textColour: 'text-yellow-400' },
  { id: 'disqualified',  label: 'Disqualified',  dealLabel: 'Unqualified',        colour: 'bg-red-500',    textColour: 'text-red-400'    },
]

function CollapsedColumnStub({
  col, count, onShow,
}: {
  col: { id: string; label: string; colour: string; textColour: string }
  count: number
  onShow: () => void
}) {
  return (
    <div className="flex-shrink-0 w-10 flex flex-col items-center gap-2 pt-1">
      <button
        onClick={onShow}
        title={`Show ${col.label}`}
        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <Eye size={14} />
      </button>
      <span className="text-xs text-slate-400 dark:text-slate-500">{count}</span>
      <div className="relative group flex items-center justify-center flex-1 cursor-pointer" onClick={onShow}>
        <Info size={13} className={col.textColour} />
        <div className="absolute left-full ml-2 hidden group-hover:block z-50 whitespace-nowrap bg-gray-900 dark:bg-neutral-800 text-white text-xs rounded-md px-2 py-1 pointer-events-none">
          {col.label}
        </div>
      </div>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', col.colour)} />
    </div>
  )
}

function KanbanColumn({
  col, leads, loading, runStatus,
  onRun, onRerun, onRunOnly, isPendingRun,
  selected, onSelect, onOpen, onSetGroup, onHide,
}: {
  col: typeof KANBAN_COLUMNS[number]
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
  onHide: () => void
}) {
  const [limit, setLimit]     = useState(15)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef     = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)

  const visibleLeads = leads.slice(0, limit)
  const hasMore      = leads.length > limit

  useEffect(() => { setLimit(15) }, [leads])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root     = scrollRef.current
    if (!sentinel || !root || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setLimit(p => Math.min(p + 25, leads.length)) },
      { root, threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, leads.length])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="flex-shrink-0 w-[260px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('w-2 h-2 rounded-full', col.colour)} />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{col.label}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{leads.length}</span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-md z-20">
              <button
                onClick={() => { setMenuOpen(false); onHide() }}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
              >
                <EyeOff size={11} /> Hide column
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable card list */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 animate-pulse h-32" />
          ) : visibleLeads.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center text-xs text-slate-400 dark:text-slate-500">
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
                  cardStyle="technical"
                />
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="h-6 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{leads.length - limit} more</span>
                </div>
              )}
            </>
          )}
        </div>
        {hasMore && (
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-gray-50 dark:from-slate-950 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  )
}

export function TechnicalKanban() {
  const qc = useQueryClient()

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [runStatus,     setRunStatus]     = useState<Record<string, string>>({})
  const [detailLeadId,       setDetailLeadId]       = useState<string | null>(null)
  const [groupPickerLeadId,  setGroupPickerLeadId]  = useState<string | null>(null)

  const clearStatus = (id: string) =>
    setTimeout(() => setRunStatus(s => { const n = { ...s }; delete n[id]; return n }), 8000)

  const { data: kanbanData, isLoading } = useQuery({
    queryKey: ['leads-kanban', '', {}],
    queryFn:  () => api.get('/leads/', { params: { page_size: 500, page: 1 } }).then(r => r.data),
    staleTime: 30_000,
  })
  const kanbanLeads: any[] = kanbanData?.leads ?? []

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

  const toggleSelect = (id: string) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const byStage = KANBAN_COLUMNS.reduce<Record<string, any[]>>((acc, col) => {
    acc[col.id] = kanbanLeads.filter((l: any) => l.lifecycle_stage === col.id)
    return acc
  }, {})

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {KANBAN_COLUMNS.map(col => hiddenColumns.has(col.id) ? (
          <CollapsedColumnStub
            key={col.id}
            col={col}
            count={(byStage[col.id] ?? []).length}
            onShow={() => setHiddenColumns(s => { const n = new Set(s); n.delete(col.id); return n })}
          />
        ) : (
          <KanbanColumn
            key={col.id}
            col={col}
            leads={byStage[col.id] ?? []}
            loading={isLoading}
            runStatus={runStatus}
            onRun={id => runMutation.mutate(id)}
            onRerun={(id, from) => rerunMutation.mutate({ leadId: id, from })}
            onRunOnly={(id, agentType) => runOnlyMutation.mutate({ leadId: id, agentType })}
            isPendingRun={id => runMutation.isPending && runMutation.variables === id}
            selected={selected}
            onSelect={toggleSelect}
            onOpen={id => setDetailLeadId(id)}
            onSetGroup={id => setGroupPickerLeadId(id)}
            onHide={() => setHiddenColumns(s => new Set([...s, col.id]))}
          />
        ))}
      </div>

      {detailLeadId && (
        <LeadDetailModal
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
        />
      )}

      {groupPickerLeadId && (
        <GroupPickerModal
          leadId={groupPickerLeadId}
          currentGroup={kanbanLeads.find((l: any) => l.id === groupPickerLeadId)?.corporate_group ?? null}
          onClose={() => setGroupPickerLeadId(null)}
          onSaved={() => {
            setGroupPickerLeadId(null)
            qc.invalidateQueries({ queryKey: ['leads-kanban'] })
          }}
        />
      )}
    </>
  )
}
