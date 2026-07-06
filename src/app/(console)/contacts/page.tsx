'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Table2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

import { ContactsTable, sortContacts }   from '@/components/contacts/ContactsTable'
import { EmailsView }                    from '@/components/contacts/EmailsView'
import { FiltersButton }                 from '@/components/contacts/FiltersButton'
import { EmailIntelligencePanel }        from '@/components/contacts/EmailIntelligencePanel'
import type {
  Contact,
  ContactsResponse,
  FiltersState,
  SortField,
  SortDir,
} from '@/components/contacts/types'

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, badge, badgeCls }: {
  label: string; value: number | string; badge: string; badgeCls: string
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-white dark:bg-neutral-900 rounded-3xl px-5 py-4 border border-slate-100 dark:border-neutral-800 min-w-[140px]">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</span>
        <span className={cn('text-xs font-medium px-2 py-1 rounded-2xl whitespace-nowrap', badgeCls)}>{badge}</span>
      </div>
    </div>
  )
}

// ── CollapsibleSearch ─────────────────────────────────────────────────────────

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
      <button onClick={expand} className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      </button>
    )
  }
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      <input
        ref={inputRef}
        placeholder="Search contacts…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="w-64 pl-9 pr-3 h-10 text-sm bg-white dark:bg-neutral-900 border border-slate-200 dark:border-slate-700 focus:border-slate-300 dark:focus:border-slate-600 rounded-full placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-600 dark:text-slate-300 outline-none"
      />
    </div>
  )
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FiltersState = {
  tierFilter: '', resolvableOnly: false, zbUnverified: false, company: '', domain: '', topN: '',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const queryClient = useQueryClient()

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [viewMode,   setViewMode]   = useState<'table' | 'emails'>('table')
  const [search,     setSearch]     = useState('')
  const [filters,    setFilters]    = useState<FiltersState>(DEFAULT_FILTERS)
  const [page,       setPage]       = useState(1)
  const [sortField,  setSortField]  = useState<SortField>('status')
  const [sortDir,    setSortDir]    = useState<SortDir>('asc')
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [bulkState,  setBulkState]  = useState<'idle' | 'pending' | 'done' | 'failed'>('idle')

  const patchFilters = (patch: Partial<FiltersState>) => {
    setFilters(f => ({ ...f, ...patch }))
    setPage(1)
  }

  const activeFilterCount = [
    filters.tierFilter, filters.resolvableOnly, filters.zbUnverified,
    filters.company, filters.domain, filters.topN,
  ].filter(Boolean).length

  const orderingParam = sortField ? (sortDir === 'desc' ? `-${sortField}` : sortField) : undefined

  const queryParams = {
    search:          search              || undefined,
    tier:            filters.tierFilter  || undefined,
    resolvable_only: filters.resolvableOnly ? 'true' : undefined,
    zb_unverified:   filters.zbUnverified   ? 'true' : undefined,
    company:         filters.company    || undefined,
    domain:          filters.domain     || undefined,
    top_n:           filters.topN       || undefined,
    ordering:        orderingParam,
    page,
  }

  const { data, isLoading } = useQuery<ContactsResponse>({
    queryKey: ['contacts', queryParams],
    queryFn:  () => api.get('/contacts', { params: queryParams }).then(r => r.data),
    placeholderData: prev => prev,
    staleTime: 15_000,
  })

  const { data: needsEmailData } = useQuery<ContactsResponse>({
    queryKey: ['contacts-needs-email-count'],
    queryFn:  () => api.get('/contacts', { params: { resolvable_only: 'true', page: 1 } }).then(r => r.data),
    staleTime: 60_000,
  })

  const { data: zbData } = useQuery<ContactsResponse>({
    queryKey: ['contacts-zb-unverified-count'],
    queryFn:  () => api.get('/contacts', { params: { zb_unverified: 'true', page: 1 } }).then(r => r.data),
    staleTime: 60_000,
  })

  const contacts   = useMemo(() => data?.contacts ?? [], [data])
  const total      = data?.total      ?? 0
  const totalPages = data?.total_pages ?? 1
  const needsEmail = needsEmailData?.total ?? 0
  const zbPending  = zbData?.total ?? 0

  const handleSort     = (field: SortField, dir: SortDir) => { setSortField(field); setSortDir(dir); setPage(1) }
  const handleResolved = useCallback(() => { queryClient.invalidateQueries({ queryKey: ['contacts'] }) }, [queryClient])

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAll = () => setSelected(selected.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id)))

  const pollBulk = useCallback((taskId: string) => {
    let attempts = 0
    const tick = async () => {
      try {
        const { data: d } = await api.get(`/contacts/bulk-verify/status/${taskId}`)
        if (d.state === 'SUCCESS') {
          setBulkState('done')
          setSelected(new Set())
          queryClient.invalidateQueries({ queryKey: ['contacts'] })
          queryClient.invalidateQueries({ queryKey: ['contacts-zb-unverified-count'] })
          return
        }
        if (d.state === 'FAILURE') { setBulkState('failed'); return }
      } catch { /* ignore */ }
      if (++attempts < 60) setTimeout(tick, 3000)
      else setBulkState('failed')
    }
    setTimeout(tick, 2000)
  }, [queryClient])

  const bulkVerifyMutation = useMutation({
    mutationFn: () => api.post('/contacts/bulk-verify', { contact_ids: [...selected] }).then(r => r.data),
    onSuccess: ({ task_id }) => { setBulkState('pending'); pollBulk(task_id) },
    onError:   () => setBulkState('failed'),
  })

  if (selectedContact) {
    return (
      <EmailIntelligencePanel
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onContactUpdated={(updated) => {
          setSelectedContact(updated)
          handleResolved()
        }}
      />
    )
  }

  return (
    <div className="p-8 space-y-6">

      {/* ── Hero band ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="lg:min-w-[240px]">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Contacts</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">Buying-committee contacts across all pipeline leads.</p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <StatCard
            label="Total contacts"
            value={total}
            badge="All leads"
            badgeCls="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400"
          />
          <StatCard
            label="Needs real email"
            value={needsEmail}
            badge={needsEmail > 0 ? 'Actionable' : 'All good'}
            badgeCls={needsEmail > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'}
          />
          <StatCard
            label="Not ZB verified"
            value={zbPending}
            badge={zbPending > 0 ? 'Unverified' : 'All done'}
            badgeCls={zbPending > 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'}
          />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: view tabs */}
        <div className="flex items-center gap-0.5">
          {([
            { id: 'table',  label: 'Table',  Icon: Table2 },
            { id: 'emails', label: 'Emails', Icon: Mail   },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                viewMode === id
                  ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-slate-100'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Right: search + filter */}
        <div className="flex items-center gap-2">
          <CollapsibleSearch value={search} onChange={v => { setSearch(v); setPage(1) }} />
          <FiltersButton filters={filters} onChange={patchFilters} activeCount={activeFilterCount} />
        </div>
      </div>

      {/* ── View content ── */}
      {viewMode === 'emails' && (
        <EmailsView filters={filters} />
      )}

      {viewMode === 'table' && (
        <ContactsTable
          contacts={contacts}
          isLoading={isLoading}
          search={search}
          selected={selected}
          sortField={sortField}
          sortDir={sortDir}
          page={page}
          totalPages={totalPages}
          bulkState={bulkState}
          onToggleAll={toggleAll}
          onToggleSelect={toggleSelect}
          onSort={handleSort}
          onPage={p => { setPage(p); setSelected(new Set()) }}
          onResolved={handleResolved}
          onBulkVerify={() => bulkVerifyMutation.mutate()}
          onBulkClear={() => setSelected(new Set())}
          onRowClick={setSelectedContact}
        />
      )}
    </div>
  )
}
