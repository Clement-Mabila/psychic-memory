'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronDown, ChevronRight, Squircle, Triangle, Circle, Star } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useTicketAccountFocus } from '@/lib/ticket-account-context'
import axios from 'axios'
import Cookies from 'js-cookie'
import type { TicketListItem } from './TicketCard'

// ── Helpers ───────────────────────────────────────────────────────────────────

function emailToDomain(email: string): string {
  return email.split('@')[1] ?? email
}

function domainToLabel(domain: string): string {
  const name = domain.split('.')[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function authHeaders() {
  const token = Cookies.get('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const ACTIVE_STATUSES = new Set(['open', 'auto_responded', 'in_review'])

const SHAPE_PALETTE: { icon: React.ElementType; color: string }[] = [
  { icon: Triangle, color: 'text-green-500'  },
  { icon: Circle,   color: 'text-violet-500' },
  { icon: Star,     color: 'text-amber-500'  },
  { icon: Squircle, color: 'text-blue-500'   },
]

function accountShape(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return SHAPE_PALETTE[hash % SHAPE_PALETTE.length]
}

interface AccountEntry {
  key:       string
  domain:    string
  label:     string
  openCount: number
  tickets:   TicketListItem[]
}

function resolveAccount(t: TicketListItem): { key: string; label: string; domain: string } {
  const cn = t.metadata?.company_name
  if (cn) {
    return {
      key:    cn.toLowerCase(),
      label:  cn,
      domain: t.metadata?.company_domain ?? cn.toLowerCase(),
    }
  }
  const domain = emailToDomain(t.submitter_email)
  return { key: domain, label: domainToLabel(domain), domain }
}

function groupByAccount(tickets: TicketListItem[]): AccountEntry[] {
  const map = new Map<string, { label: string; domain: string; tickets: TicketListItem[] }>()
  for (const t of tickets) {
    const { key, label, domain } = resolveAccount(t)
    if (!map.has(key)) map.set(key, { label, domain, tickets: [] })
    map.get(key)!.tickets.push(t)
  }
  return Array.from(map.entries()).map(([key, { label, domain, tickets: list }]) => ({
    key,
    domain,
    label,
    openCount: list.filter(t => ACTIVE_STATUSES.has(t.status)).length,
    tickets:   list,
  }))
}

// ── AccountItem ───────────────────────────────────────────────────────────────

function AccountItem({
  entry,
  isActive,
  onSelect,
}: {
  entry:    AccountEntry
  isActive: boolean
  onSelect: () => void
}) {
  const [open, setOpen] = useState(false)
  const recent = entry.tickets.slice(0, 3)
  const shape     = accountShape(entry.key)
  const ShapeIcon = shape.icon
  const shapeColor = entry.openCount > 0 ? shape.color : 'text-stone-400 dark:text-stone-600'

  return (
    <div>
      <div
        onClick={() => { setOpen(o => !o); onSelect() }}
        className={cn(
          'group flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all',
          isActive
            ? 'bg-white dark:bg-neutral-900 shadow-sm'
            : 'hover:bg-white/70 dark:hover:bg-neutral-800',
        )}
      >
        <ShapeIcon size={14} className={cn('flex-shrink-0', shapeColor)} strokeWidth={1.75} />

        <span className="flex-1 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 truncate leading-none">
          {entry.label}
        </span>

        {entry.openCount > 0 && (
          <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {entry.openCount > 99 ? '99+' : entry.openCount}
          </span>
        )}

        {recent.length > 0 && (
          open
            ? <ChevronDown  size={11} className="text-gray-400 dark:text-slate-500 shrink-0" />
            : <ChevronRight size={11} className="text-gray-400 dark:text-slate-500 shrink-0" />
        )}
      </div>

      {open && recent.length > 0 && (
        <div className="ml-5 mt-0.5 mb-1 space-y-px border-l border-gray-100 dark:border-neutral-800 pl-3">
          {recent.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2 w-full px-2 py-1 rounded-lg text-left group/ticket"
            >
              <Squircle size={13} className="shrink-0 text-stone-500 dark:text-slate-400" strokeWidth={1.5} />
              <span className="text-xs text-gray-500 dark:text-slate-400 group-hover/ticket:text-gray-700 dark:group-hover/ticket:text-slate-200 truncate">
                {t.subject}
              </span>
              <span className="ml-auto text-[10px] text-gray-300 dark:text-slate-600 shrink-0">
                {formatRelativeTime(t.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TicketAccountPanel ────────────────────────────────────────────────────────

export function TicketAccountPanel() {
  const { ticketFocus, setTicketFocus } = useTicketAccountFocus()
  const [searchQ,       setSearchQ]     = useState('')
  const [openSections,  setOpenSections] = useState({ Active: true, Resolved: false })

  const { data: tickets = [] } = useQuery<TicketListItem[]>({
    queryKey: ['ticket-list'],
    queryFn: async () => {
      const { data } = await axios.get('/api/tickets/', {
        params: { per_page: 100 },
        headers: authHeaders(),
      })
      return data.results ?? []
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  })

  const accounts = groupByAccount(tickets)

  const active   = accounts.filter((a: AccountEntry) => a.openCount > 0)
  const resolved = accounts.filter((a: AccountEntry) => a.openCount === 0)

  const filter = (list: AccountEntry[]) =>
    searchQ
      ? list.filter(a => a.label.toLowerCase().includes(searchQ.toLowerCase()) || a.domain.toLowerCase().includes(searchQ.toLowerCase()))
      : list

  const toggle = (s: string) => setOpenSections(p => ({ ...p, [s]: !p[s as keyof typeof p] }))

  function handleSelect(entry: AccountEntry) {
    if (ticketFocus?.domain === entry.key) {
      setTicketFocus(null)
    } else {
      setTicketFocus({
        domain:        entry.key,
        label:         entry.label,
        recentTickets: entry.tickets.slice(0, 3).map(t => ({
          id:         t.id,
          subject:    t.subject,
          created_at: t.created_at,
        })),
      })
    }
  }

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 overflow-hidden">

      {/* Search */}
      <div className="px-1.5 pt-3 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg">
          <Search size={14} className="text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search accounts…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-500 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto pb-4 px-2 space-y-1">

        {/* Active */}
        <div>
          <button
            onClick={() => toggle('Active')}
            className="flex items-center gap-1.5 w-full px-2 py-2.5 text-left"
          >
            {openSections.Active
              ? <ChevronDown  size={13} className="text-slate-500 dark:text-slate-400" />
              : <ChevronRight size={13} className="text-slate-500 dark:text-slate-400" />}
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Active</span>
            {active.length > 0 && (
              <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">{active.length}</span>
            )}
          </button>
          {openSections.Active && filter(active).map(a => (
            <AccountItem
              key={a.key}
              entry={a}
              isActive={ticketFocus?.domain === a.key}
              onSelect={() => handleSelect(a)}
            />
          ))}
          {openSections.Active && filter(active).length === 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 px-4 py-2">No active accounts</p>
          )}
        </div>

        {/* Resolved */}
        <div>
          <button
            onClick={() => toggle('Resolved')}
            className="flex items-center gap-1.5 w-full px-2 py-2.5 mt-4 text-left"
          >
            {openSections.Resolved
              ? <ChevronDown  size={13} className="text-slate-500 dark:text-slate-400" />
              : <ChevronRight size={13} className="text-slate-500 dark:text-slate-400" />}
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Resolved</span>
            {resolved.length > 0 && (
              <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">{resolved.length}</span>
            )}
          </button>
          {openSections.Resolved && filter(resolved).map(a => (
            <AccountItem
              key={a.key}
              entry={a}
              isActive={ticketFocus?.domain === a.key}
              onSelect={() => handleSelect(a)}
            />
          ))}
        </div>

      </nav>
    </div>
  )
}
