'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, ListFilter, Check, X,
  ChevronUp, ChevronDown, ChevronsUpDown,
  MoreVertical, RefreshCw, ExternalLink,
  CheckCheck, Calendar, Loader2, Users,
  Star, Share2, ShieldOff, BadgeCheck, Wallet, User,
  ShieldCheck, Hash, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  lead_id: string
  lead_name: string | null
  lead_domain: string | null
  name: string
  title: string
  department: string | null
  buying_role: string
  priority_rank: number
  email: string | null
  email_confidence: string
  email_verified: boolean
  verification_tier: string
  verified_with_zerobounce: boolean
  zb_verified_at: string | null
  ai_inferred_email: string | null
  ai_inferred_email_status: string
  phone: string | null
  linkedin_url: string | null
  outreach_status: string
  resolvable: boolean
  zb_verifiable: boolean
  modified: string | null
}

interface ContactsResponse {
  contacts: Contact[]
  total: number
  page: number
  total_pages: number
}

type SortField = 'name' | 'company' | 'role' | 'modified' | null
type SortDir   = 'asc' | 'desc'

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-50 dark:bg-blue-950/40 text-white',   'bg-stone-50 dark:bg-slate-800 text-white',
  'bg-pink-500 text-white',   'bg-rose-500 text-white',
  'bg-sky-50 dark:bg-sky-950/400 text-white',    'bg-fuchsia-50 dark:bg-fuchsia-950/400 text-white',
  'bg-teal-500 text-white',   'bg-violet-600 text-white',
]

function getAvatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  const p = name.trim().split(/\s+/)
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function Avatar({ name }: { name: string }) {
  return (
    <span className={cn('w-7 h-7 text-[11px] rounded-full font-semibold flex items-center justify-center flex-shrink-0', getAvatarColor(name))}>
      {getInitials(name)}
    </span>
  )
}

// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  verified:  { bg: 'bg-blue-50 dark:bg-blue-950/40',    text: 'text-white', label: 'Verified'  },
  probable:  { bg: 'bg-amber-400',   text: 'text-white', label: 'Probable'  },
  inferred:  { bg: 'bg-pink-500',    text: 'text-white', label: 'Inferred'  },
  not_found: { bg: 'bg-red-50 dark:bg-red-950/400',     text: 'text-white', label: 'No Email'  },
  blocked:   { bg: 'bg-gray-800',    text: 'text-white', label: 'Blocked'   },
}

function TierBadge({ tier }: { tier: string }) {
  const s = TIER_BADGE[tier] ?? TIER_BADGE.not_found
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', s.bg, s.text)}>
      {s.label}
    </span>
  )
}

// ── Role cell ─────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { icon: React.ElementType; color: string }> = {
  champion:       { icon: Star,       color: 'text-violet-500 dark:text-violet-400' },
  influencer:     { icon: Share2,     color: 'text-blue-500 dark:text-blue-400'   },
  blocker:        { icon: ShieldOff,  color: 'text-red-400'    },
  approver:       { icon: BadgeCheck, color: 'text-amber-500 dark:text-amber-400'  },
  economic_buyer: { icon: Wallet,     color: 'text-emerald-500 dark:text-emerald-400'},
  other:          { icon: User,       color: 'text-slate-400 dark:text-slate-500'  },
}

function RoleCell({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META.other
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', meta.color)} strokeWidth={1.75} />
      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{role.replace(/_/g, ' ')}</span>
    </div>
  )
}

// ── Email cell ────────────────────────────────────────────────────────────────

function EmailCell({ email }: { email: string }) {
  const [visible, setVisible] = useState(false)
  const [copied,  setCopied]  = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => { setCopied(false); setVisible(false) }, 1500)
    })
  }

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => { if (!copied) setVisible(false) }}
    >
      <div className={cn(
        'absolute bottom-full left-0 mb-2.5 z-50 transition-all duration-150',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none',
      )}>
        <div
          onClick={handleCopy}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none whitespace-nowrap"
        >
          {copied ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCheck className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-sm font-medium">Copied!</span>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Click to copy</p>
              <p className="text-sm font-medium text-black dark:text-slate-100">{email}</p>
            </>
          )}
        </div>
        <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 rotate-45" />
      </div>
      <span className="truncate max-w-[160px] cursor-default text-sm font-medium text-slate-800 dark:text-slate-200">{email}</span>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

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

// ── Collapsible search ────────────────────────────────────────────────────────

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

// ── Filters dropdown ──────────────────────────────────────────────────────────

const TIER_OPTIONS = [
  { value: 'verified',  label: 'Verified',  bg: 'bg-blue-50 dark:bg-blue-950/40',  text: 'text-white' },
  { value: 'probable',  label: 'Probable',  bg: 'bg-amber-400', text: 'text-white' },
  { value: 'inferred',  label: 'Inferred',  bg: 'bg-pink-500',  text: 'text-white' },
  { value: 'not_found', label: 'No Email',  bg: 'bg-red-50 dark:bg-red-950/400',   text: 'text-white' },
]

interface FiltersState {
  tierFilter: string
  resolvableOnly: boolean
  zbUnverified: boolean
  company: string
  domain: string
  topN: string
}

function FiltersButton({ filters, onChange, activeCount }: {
  filters: FiltersState
  onChange: (patch: Partial<FiltersState>) => void
  activeCount: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const clear = () => onChange({ tierFilter: '', resolvableOnly: false, zbUnverified: false, company: '', domain: '', topN: '' })

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'relative h-10 w-10 rounded-2xl border flex items-center justify-center transition-colors',
          open ? 'bg-slate-900 dark:bg-neutral-700 border-slate-900 dark:border-slate-700 text-white' : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
        )}
      >
        <ListFilter className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-fuchsia-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-700 shadow-xl dark:shadow-black/40 p-4 space-y-4">

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Filters</p>
            {activeCount > 0 && (
              <button onClick={clear} className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Email status */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Email status</p>
            <div className="flex flex-wrap gap-2">
              {TIER_OPTIONS.map(opt => {
                const selected = filters.tierFilter === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ tierFilter: selected ? '' : opt.value })}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selected ? 'bg-slate-900 dark:bg-neutral-700 text-white border-slate-900' : `${opt.bg} ${opt.text} border-transparent`,
                    )}
                  >
                    {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Quick filters */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Quick filters</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'resolvableOnly', label: 'Needs real email' },
                { key: 'zbUnverified',   label: 'Not ZB verified'  },
              ].map(({ key, label }) => {
                const active = filters[key as keyof FiltersState] === true
                return (
                  <button
                    key={key}
                    onClick={() => onChange({ [key]: !active } as Partial<FiltersState>)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      active ? 'bg-slate-900 dark:bg-neutral-700 text-white border-slate-900' : 'bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600',
                    )}
                  >
                    {active && <Check className="h-3 w-3 flex-shrink-0" />}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Advanced — company / domain / top N */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Advanced</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  placeholder="Company name contains…"
                  value={filters.company}
                  onChange={e => onChange({ company: e.target.value })}
                  className="flex-1 h-8 px-2.5 text-xs bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg outline-none focus:border-slate-300 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  placeholder="Domain contains… (e.g. gateway)"
                  value={filters.domain}
                  onChange={e => onChange({ domain: e.target.value })}
                  className="flex-1 h-8 px-2.5 text-xs bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg outline-none focus:border-slate-300 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  placeholder="Top N per company (e.g. 3)"
                  value={filters.topN}
                  onChange={e => onChange({ topN: e.target.value })}
                  className="flex-1 h-8 px-2.5 text-xs bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg outline-none focus:border-slate-300 dark:focus:border-slate-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500"
                />
              </div>
            </div>
            {(filters.company || filters.domain || filters.topN) && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                {filters.topN ? `Top ${filters.topN} contacts` : 'All contacts'}
                {filters.company ? ` from "${filters.company}"` : ''}
                {filters.domain  ? ` on *${filters.domain}*`   : ''}
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkActionBar({ count, onVerify, onClear, isPending }: {
  count: number
  onVerify: () => void
  onClear: () => void
  isPending: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-100 dark:border-fuchsia-800 rounded-xl">
      <div className="flex items-center gap-2 text-xs text-fuchsia-700 dark:text-fuchsia-300 font-medium">
        <Check className="h-4 w-4 flex-shrink-0" />
        {count} contact{count !== 1 ? 's' : ''} selected
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="h-7 px-2.5 text-xs text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-950/40 rounded-lg transition-colors"
        >
          Deselect
        </button>
        <button
          onClick={onVerify}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
          {isPending ? 'Verifying…' : 'Verify with ZeroBounce'}
        </button>
      </div>
    </div>
  )
}

// ── Row actions dropdown ──────────────────────────────────────────────────────

type RowAction = 'idle' | 'finding' | 'verifying' | 'done' | 'failed'

function RowActions({ contact, onResolved }: { contact: Contact; onResolved: (id: string) => void }) {
  const [open,   setOpen]   = useState(false)
  const [action, setAction] = useState<RowAction>('idle')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const poll = useCallback((endpoint: string, taskId: string, finalAction: RowAction = 'done') => {
    let attempts = 0
    const tick = async () => {
      try {
        const { data } = await api.get(endpoint.replace(':taskId', taskId))
        if (data.state === 'SUCCESS') { setAction(finalAction); onResolved(contact.id); return }
        if (data.state === 'FAILURE') { setAction('failed'); return }
      } catch { /* ignore */ }
      if (++attempts < 30) setTimeout(tick, 2000)
      else setAction('failed')
    }
    setTimeout(tick, 2000)
  }, [contact.id, onResolved])

  const dispatchFind = useMutation({
    mutationFn: () => api.post(`/contacts/${contact.id}/find-email`).then(r => r.data),
    onSuccess: ({ task_id }) => { setOpen(false); setAction('finding'); poll(`/contacts/${contact.id}/find-email/status/:taskId`, task_id) },
    onError: () => setAction('failed'),
  })

  const dispatchVerify = useMutation({
    mutationFn: () => api.post(`/contacts/${contact.id}/verify-email`).then(r => r.data),
    onSuccess: ({ task_id }) => { setOpen(false); setAction('verifying'); poll(`/contacts/${contact.id}/verify-email/status/:taskId`, task_id) },
    onError: () => setAction('failed'),
  })

  const isRunning = action === 'finding' || action === 'verifying'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !isRunning && setOpen(p => !p)}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {isRunning   ? <Loader2 className="h-4 w-4 text-fuchsia-500 animate-spin" />  :
         action === 'done'   ? <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />          :
         action === 'failed' ? <X className="h-4 w-4 text-red-400" />                  :
         <MoreVertical className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-lg p-1">

          {/* Verify with ZeroBounce — for contacts with email not yet ZB-verified */}
          {contact.zb_verifiable && (
            <button
              onClick={() => dispatchVerify.mutate()}
              disabled={dispatchVerify.isPending}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-950/40 dark:hover:bg-blue-950/40 transition-colors"
            >
              <ShieldCheck className="h-3 w-3" />
              Verify with ZeroBounce
            </button>
          )}

          {/* Find real email — for contacts without a verified email */}
          {contact.resolvable && (
            <button
              onClick={() => dispatchFind.mutate()}
              disabled={dispatchFind.isPending}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-50 dark:bg-fuchsia-950/40 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Find Real Email
            </button>
          )}

          {/* If ZB failed — offer to re-run full discovery */}
          {!contact.resolvable && contact.verified_with_zerobounce && contact.verification_tier !== 'verified' && (
            <button
              onClick={() => dispatchFind.mutate()}
              disabled={dispatchFind.isPending}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:bg-amber-950/40 dark:hover:bg-amber-950/40 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              ZB failed — try again
            </button>
          )}

          {contact.linkedin_url && (
            <>
              {(contact.zb_verifiable || contact.resolvable) && <div className="my-1 border-t border-slate-100 dark:border-slate-800" />}
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> View LinkedIn
              </a>
            </>
          )}

          {/* Running / done state feedback */}
          {isRunning && (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-blue-500 dark:text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              {action === 'verifying' ? 'Verifying…' : 'Finding email…'}
            </div>
          )}
          {action === 'failed' && (
            <div className="px-2 py-2 text-xs text-red-500 dark:text-red-400">Failed — check logs</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sortable header ───────────────────────────────────────────────────────────

function SortHead({ label, field, sortField, sortDir, onSort, className }: {
  label: string; field: SortField
  sortField: SortField; sortDir: SortDir
  onSort: (f: SortField, d: SortDir) => void
  className?: string
}) {
  const active = sortField === field
  return (
    <th
      className={cn('py-3.5 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer select-none', className)}
      onClick={() => onSort(field, active && sortDir === 'asc' ? 'desc' : 'asc')}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {active
          ? sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />}
      </div>
    </th>
  )
}

// ── Sort helper ───────────────────────────────────────────────────────────────

function sortContacts(contacts: Contact[], field: SortField, dir: SortDir): Contact[] {
  if (!field) return contacts
  return [...contacts].sort((a, b) => {
    let av = '', bv = ''
    if (field === 'name')     { av = a.name.toLowerCase();              bv = b.name.toLowerCase() }
    if (field === 'company')  { av = (a.lead_name ?? '').toLowerCase(); bv = (b.lead_name ?? '').toLowerCase() }
    if (field === 'role')     { av = a.buying_role;                     bv = b.buying_role }
    if (field === 'modified') { av = a.modified ?? '';                  bv = b.modified ?? '' }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ?  1 : -1
    return 0
  })
}

// ── Pagination ────────────────────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): (number | string)[] {
  const pages: (number | string)[] = []
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) pages.push(i)
    else if ((i === 2 && current > 3) || (i === total - 1 && current < total - 2))
      pages.push(i === 2 ? 'start' : 'end')
  }
  return pages
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = buildPageNumbers(page, totalPages)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center gap-1 justify-center pt-2">
      <button onClick={() => onPage(page - 1)} disabled={page === 1} className="px-2 h-8 text-xs rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
      {pages.map((p, i) => (
        typeof p === 'number'
          ? <button key={p} onClick={() => onPage(p)} className={cn('h-8 w-8 text-xs rounded-lg', page === p ? 'bg-slate-900 dark:bg-neutral-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800')}>{p}</button>
          : <span key={`e-${i}`} className="h-8 w-6 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">…</span>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="px-2 h-8 text-xs rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
    </div>
  )
}

// ── Contact row ───────────────────────────────────────────────────────────────

function ContactRow({ contact, selected, onSelect, onResolved }: {
  contact: Contact; selected: boolean
  onSelect: (id: string) => void; onResolved: (id: string) => void
}) {
  const dateLabel = contact.modified
    ? new Date(contact.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <tr className={cn('border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors', selected && 'bg-violet-50 dark:bg-violet-950/40')}>

      <td className="py-4 px-4 w-10">
        <input type="checkbox" checked={selected} onChange={() => onSelect(contact.id)}
          className="w-4 h-4 rounded border-slate-300 accent-fuchsia-600 cursor-pointer" />
      </td>

      <td className="py-4 px-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={contact.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[140px]">{contact.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{contact.title}</p>
          </div>
        </div>
      </td>

      <td className="py-4 px-4">
        <p className="text-sm text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{contact.lead_name ?? '—'}</p>
        {contact.lead_domain && <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{contact.lead_domain}</p>}
      </td>

      <td className="py-4 px-4">
        <TierBadge tier={contact.verification_tier} />
        {contact.verified_with_zerobounce && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="h-3 w-3" /> ZB
          </span>
        )}
      </td>

      <td className="py-4 px-4 min-w-[180px]">
        {contact.email
          ? <EmailCell email={contact.email} />
          : contact.ai_inferred_email
            ? <span className="text-sm font-medium text-slate-400 dark:text-slate-500 italic block truncate max-w-[160px]">{contact.ai_inferred_email}</span>
            : <span className="text-sm text-slate-300 dark:text-slate-600">—</span>}
      </td>

      <td className="py-4 px-4"><RoleCell role={contact.buying_role} /></td>

      <td className="py-4 px-4 hidden lg:table-cell">
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
          {dateLabel}
        </div>
      </td>

      <td className="py-4 px-2">
        <RowActions contact={contact} onResolved={onResolved} />
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FiltersState = {
  tierFilter: '', resolvableOnly: false, zbUnverified: false, company: '', domain: '', topN: '',
}

export default function ContactsPage() {
  const queryClient = useQueryClient()

  const [search,    setSearch]    = useState('')
  const [filters,   setFilters]   = useState<FiltersState>(DEFAULT_FILTERS)
  const [page,      setPage]      = useState(1)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir,   setSortDir]   = useState<SortDir>('asc')
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [bulkTaskId, setBulkTaskId] = useState<string | null>(null)
  const [bulkState,  setBulkState]  = useState<'idle' | 'pending' | 'done' | 'failed'>('idle')

  const patchFilters = (patch: Partial<FiltersState>) => {
    setFilters(f => ({ ...f, ...patch }))
    setPage(1)
  }

  const activeFilterCount = [
    filters.tierFilter, filters.resolvableOnly, filters.zbUnverified,
    filters.company, filters.domain, filters.topN,
  ].filter(Boolean).length

  const queryParams = {
    search:          search            || undefined,
    tier:            filters.tierFilter || undefined,
    resolvable_only: filters.resolvableOnly ? 'true' : undefined,
    zb_unverified:   filters.zbUnverified   ? 'true' : undefined,
    company:         filters.company   || undefined,
    domain:          filters.domain    || undefined,
    top_n:           filters.topN      || undefined,
    page,
  }

  const { data, isLoading } = useQuery<ContactsResponse>({
    queryKey: ['contacts', queryParams],
    queryFn: () => api.get('/contacts', { params: queryParams }).then(r => r.data),
    placeholderData: prev => prev,
    staleTime: 15_000,
  })

  const { data: needsEmailData } = useQuery<ContactsResponse>({
    queryKey: ['contacts-needs-email-count'],
    queryFn: () => api.get('/contacts', { params: { resolvable_only: 'true', page: 1 } }).then(r => r.data),
    staleTime: 60_000,
  })

  const { data: zbData } = useQuery<ContactsResponse>({
    queryKey: ['contacts-zb-unverified-count'],
    queryFn: () => api.get('/contacts', { params: { zb_unverified: 'true', page: 1 } }).then(r => r.data),
    staleTime: 60_000,
  })

  const contacts   = useMemo(() => sortContacts(data?.contacts ?? [], sortField, sortDir), [data, sortField, sortDir])
  const total      = data?.total      ?? 0
  const totalPages = data?.total_pages ?? 1
  const needsEmail = needsEmailData?.total ?? 0
  const zbPending  = zbData?.total ?? 0

  const handleSort     = (field: SortField, dir: SortDir) => { setSortField(field); setSortDir(dir) }
  const handleResolved = useCallback((id: string) => { queryClient.invalidateQueries({ queryKey: ['contacts'] }) }, [queryClient])

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAll = () => setSelected(selected.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id)))

  // Bulk ZeroBounce verify
  const bulkVerifyMutation = useMutation({
    mutationFn: () => api.post('/contacts/bulk-verify', { contact_ids: [...selected] }).then(r => r.data),
    onSuccess: ({ task_id }) => {
      setBulkTaskId(task_id)
      setBulkState('pending')
      pollBulk(task_id)
    },
    onError: () => setBulkState('failed'),
  })

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

  return (
    <div className="p-8 space-y-6">

      {/* ── Hero band ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="lg:min-w-[240px]">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Contacts</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">Buying-committee contacts across all pipeline leads.</p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <StatCard label="Total contacts"   value={total}      badge="All leads"                                  badgeCls="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400" />
          <StatCard label="Needs real email" value={needsEmail} badge={needsEmail > 0 ? 'Actionable' : 'All good'} badgeCls={needsEmail > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'} />
          <StatCard label="Not ZB verified"  value={zbPending}  badge={zbPending > 0 ? 'Unverified' : 'All done'}  badgeCls={zbPending > 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'} />
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          onVerify={() => bulkVerifyMutation.mutate()}
          onClear={() => setSelected(new Set())}
          isPending={bulkState === 'pending'}
        />
      )}
      {bulkState === 'done' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <Check className="h-4 w-4" /> Batch verification complete — results updated.
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2">
        <CollapsibleSearch value={search} onChange={v => { setSearch(v); setPage(1) }} />
        <FiltersButton filters={filters} onChange={patchFilters} activeCount={activeFilterCount} />
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <Loader2 className="h-5 w-5 text-slate-300 dark:text-neutral-600 animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="p-16 text-center rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700">
          <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6">
            <Users className="w-10 h-10 text-white -rotate-6" />
          </div>
          <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200 mb-2">No contacts found</h3>
          <p className="text-slate-400 dark:text-slate-500">{search ? 'Try adjusting your search or filters' : 'No contacts have been identified yet'}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 dark:bg-neutral-800 border-b border-slate-200 dark:border-neutral-700">
                  <th className="py-3.5 px-4 w-10">
                    <input type="checkbox"
                      checked={selected.size === contacts.length && contacts.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 accent-fuchsia-600 cursor-pointer" />
                  </th>
                  <SortHead label="Name"     field="name"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHead label="Company"  field="company"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="py-3.5 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">Status</th>
                  <th className="py-3.5 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 min-w-[180px]">Email</th>
                  <SortHead label="Role"     field="role"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHead label="Modified" field="modified" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
                  <th className="py-3.5 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <ContactRow key={c.id} contact={c} selected={selected.has(c.id)} onSelect={toggleSelect} onResolved={handleResolved} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              {selected.size > 0 && <span className="ml-2 text-fuchsia-600 dark:text-fuchsia-400 font-medium">· {selected.size} selected</span>}
            </p>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={p => { setPage(p); setSelected(new Set()) }} />
    </div>
  )
}
