'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutGrid, Table2, Search, ListFilter, Check, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'
import Cookies from 'js-cookie'
import { securityApi } from '@/lib/api'
import { useTicketAccountFocus } from '@/lib/ticket-account-context'
import { TicketKanbanCard } from '@/components/tickets/TicketKanbanCard'
import { TicketConversationPanel } from '@/components/tickets/TicketConversationPanel'
import type { TicketListItem } from '@/components/tickets/TicketCard'

// ── API ───────────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = Cookies.get('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchTicketList(): Promise<TicketListItem[]> {
  const { data } = await axios.get('/api/tickets/', {
    params: { per_page: 100 },
    headers: authHeaders(),
  })
  return data.results ?? []
}

// ── Kanban config ─────────────────────────────────────────────────────────────

const TICKET_COLUMNS = [
  { id: 'open',        label: 'New Request', colour: 'bg-red-400',     statuses: ['open']                       },
  { id: 'in_progress', label: 'In Progress', colour: 'bg-orange-400',  statuses: ['auto_responded', 'in_review'] },
  { id: 'complete',    label: 'Complete',    colour: 'bg-emerald-400', statuses: ['resolved', 'closed']          },
]

// ── Filter options ────────────────────────────────────────────────────────────

const PRIORITIES = ['urgent', 'high', 'medium', 'low']
const TICKET_TYPES = [
  { value: 'data_request',      label: 'Data Request'    },
  { value: 'general_enquiry',   label: 'General Enquiry' },
  { value: 'bug_report',        label: 'Bug Report'      },
  { value: 'data_removal_gdpr', label: 'GDPR Removal'    },
  { value: 'data_correction',   label: 'Data Correction' },
  { value: 'access_request',    label: 'Access Request'  },
  { value: 'feature_request',   label: 'Feature Request' },
  { value: 'missing_info',      label: 'Missing Info'    },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function emailToDomain(email: string): string {
  return email.split('@')[1] ?? email
}

function applyFilters(
  tickets:  TicketListItem[],
  search:   string,
  priority: string,
  type:     string,
  sla:      boolean,
  domain:   string | null,
): TicketListItem[] {
  return tickets.filter(t => {
    if (domain) {
      const emailDomain = emailToDomain(t.submitter_email)
      const companyKey  = (t.metadata?.company_name ?? '').toLowerCase()
      if (emailDomain !== domain && companyKey !== domain) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!t.subject.toLowerCase().includes(q) && !t.submitter_email.toLowerCase().includes(q)) return false
    }
    if (priority && t.priority !== priority) return false
    if (type && t.ticket_type !== type) return false
    if (sla && !t.sla_breached) return false
    return true
  })
}

// ── CollapsibleSearch (matches leads exactly) ─────────────────────────────────

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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        placeholder="Search subject or email…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="w-64 pl-9 pr-3 h-10 text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 focus:border-slate-300 dark:focus:border-slate-600 rounded-full placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-600 dark:text-slate-300 outline-none"
      />
    </div>
  )
}

// ── FiltersButton (matches leads style exactly) ───────────────────────────────

function FiltersButton({
  priority, type, sla,
  onPriority, onType, onSla, onClear,
}: {
  priority: string; type: string; sla: boolean
  onPriority: (v: string) => void
  onType:     (v: string) => void
  onSla:      (v: boolean) => void
  onClear:    () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeCount = (priority ? 1 : 0) + (type ? 1 : 0) + (sla ? 1 : 0)

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
          open
            ? 'bg-slate-900 dark:bg-zinc-700 border-slate-900 dark:border-slate-700 text-white'
            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
        )}
      >
        <ListFilter className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-black/40 p-4 space-y-4">

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Filters</p>
            {activeCount > 0 && (
              <button onClick={onClear} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Priority */}
          <div>
            <p className="text-sm font-normal text-slate-700 dark:text-slate-300 mb-2">Priority</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map(p => {
                const selected = priority === p
                return (
                  <button
                    key={p}
                    onClick={() => onPriority(selected ? '' : p)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selected
                        ? 'bg-slate-900 dark:bg-zinc-700 text-white border-slate-900'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300',
                    )}
                  >
                    {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Type */}
          <div>
            <p className="text-sm font-normal text-slate-700 dark:text-slate-300 mb-2">Ticket Type</p>
            <div className="flex flex-wrap gap-2">
              {TICKET_TYPES.map(t => {
                const selected = type === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => onType(selected ? '' : t.value)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selected
                        ? 'bg-slate-900 dark:bg-zinc-700 text-white border-slate-900'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300',
                    )}
                  >
                    {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* SLA */}
          <div>
            <p className="text-sm font-normal text-slate-700 dark:text-slate-300 mb-2">SLA</p>
            <button
              onClick={() => onSla(!sla)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                sla
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300',
              )}
            >
              {sla && <Check className="h-3 w-3 flex-shrink-0" />}
              SLA Breached only
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

function TicketKanbanColumn({
  col,
  tickets,
  loading,
  onOpen,
}: {
  col:     { id: string; label: string; colour: string }
  tickets: TicketListItem[]
  loading: boolean
  onOpen:  (t: TicketListItem) => void
}) {
  const [limit, setLimit] = useState(15)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)

  const visible = tickets.slice(0, limit)
  const hasMore = tickets.length > limit

  useEffect(() => { setLimit(15) }, [tickets])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root     = scrollRef.current
    if (!sentinel || !root || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setLimit(p => Math.min(p + 25, tickets.length)) },
      { root, threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, tickets.length])

  return (
    <div className="flex-shrink-0 w-[270px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn('w-2 h-2 rounded-full', col.colour)} />
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{col.label}</span>
        <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">{tickets.length}</span>
        <button className="text-gray-400 dark:text-slate-500 hover:text-gray-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>

      {/* Scrollable list */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 animate-pulse h-28" />
          ) : visible.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center text-xs text-gray-400 dark:text-slate-500">
              No tickets
            </div>
          ) : (
            <>
              {visible.map(t => (
                <TicketKanbanCard key={t.id} ticket={t} onClick={onOpen} />
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="h-6 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">{tickets.length - limit} more</span>
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

// ── TicketTable (minimal) ─────────────────────────────────────────────────────

function TicketTable({ tickets, onOpen }: { tickets: TicketListItem[]; onOpen: (t: TicketListItem) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-100 dark:border-slate-800">
          <tr>
            <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Subject</th>
            <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Submitter</th>
            <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Type</th>
            <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Priority</th>
            <th className="px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr
              key={t.id}
              onClick={() => onOpen(t)}
              className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium max-w-[260px] truncate">{t.subject}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.submitter_email}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.ticket_type.replace(/_/g, ' ')}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  'px-2 py-0.5 rounded-full font-semibold text-[10px]',
                  t.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  t.priority === 'high'   ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                )}>
                  {t.priority}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.status.replace(/_/g, ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tickets.length === 0 && (
        <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">No tickets match your filters</div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type ViewMode = 'kanban' | 'table'

const VIEW_TABS: { id: ViewMode; label: string; Icon: any }[] = [
  { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
  { id: 'table',  label: 'Table',  Icon: Table2     },
]

export default function TicketsPage() {
  const [view,     setView]     = useState<ViewMode>('kanban')
  const [search,   setSearch]   = useState('')
  const [priority, setPriority] = useState('')
  const [type,     setType]     = useState('')
  const [sla,      setSla]      = useState(false)
  const [openTicket, setOpenTicket] = useState<TicketListItem | null>(null)

  const { ticketFocus } = useTicketAccountFocus()

  const { data: me } = useQuery({ queryKey: ['security-me'], queryFn: securityApi.getMe, staleTime: 300_000 })
  const isSuperAdmin = me?.role === 'super_admin'

  const { data: allTickets = [], isLoading } = useQuery<TicketListItem[]>({
    queryKey: ['ticket-list'],
    queryFn:  fetchTicketList,
    staleTime: 5_000,
    refetchInterval: (q) => {
      const list = (q.state.data as TicketListItem[]) ?? []
      return list.some(t => t.status === 'open' || t.status === 'auto_responded') ? 10_000 : 30_000
    },
  })

  const filtered = useMemo(
    () => applyFilters(allTickets, search, priority, type, sla, ticketFocus?.domain ?? null),
    [allTickets, search, priority, type, sla, ticketFocus?.domain],
  )

  const byColumn = useMemo(() => {
    const map: Record<string, TicketListItem[]> = {}
    for (const col of TICKET_COLUMNS) {
      map[col.id] = filtered.filter(t => col.statuses.includes(t.status))
    }
    return map
  }, [filtered])

  return (
    <div className="p-7">

      {/* ── View tabs + search + filters ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">

        {/* Left: Kanban / Table tabs — exact match to leads */}
        <div className="flex items-center border-none rounded-xl overflow-hidden p-0.5 gap-0.5">
          {VIEW_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                view === id
                  ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-slate-100'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Right: search + filters — exact match to leads */}
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              title="New Ticket"
              className="h-9 w-9 rounded-2xl bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center transition-colors"
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
          )}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
          <CollapsibleSearch value={search} onChange={setSearch} />
          <FiltersButton
            priority={priority} type={type} sla={sla}
            onPriority={setPriority}
            onType={setType}
            onSla={setSla}
            onClear={() => { setPriority(''); setType(''); setSla(false) }}
          />
        </div>
      </div>

      {/* ── Kanban ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {TICKET_COLUMNS.map(col => (
            <TicketKanbanColumn
              key={col.id}
              col={col}
              tickets={byColumn[col.id] ?? []}
              loading={isLoading}
              onOpen={setOpenTicket}
            />
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {view === 'table' && (
        <TicketTable tickets={filtered} onOpen={setOpenTicket} />
      )}

      {/* ── Conversation panel ── */}
      {openTicket && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10 dark:bg-black/20"
            onClick={() => setOpenTicket(null)}
          />
          <TicketConversationPanel
            ticket={openTicket}
            isSuperAdmin={isSuperAdmin}
            onClose={() => setOpenTicket(null)}
          />
        </>
      )}
    </div>
  )
}
