'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, ArrowRight, BadgeInfo, Info, LibraryBig, Minus, Phone, Mail, Earth, UsersRound, ChevronLeft, ChevronRight, MoreHorizontal, Heart, Bookmark } from 'lucide-react'
import api, { securityApi, leadApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CardShell } from './shared'
import CompanyAvatar from '@/components/leads/CompanyAvatar'


const HEADERS: { label: string; infoBefore?: boolean }[] = [
  { label: 'Company' },
  { label: 'Details' },
  { label: 'Industry', infoBefore: true },
  { label: 'Location' },
  { label: '' },
]

function fmtEmployees(n: number | null | undefined): string | null {
  if (n == null) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`
  return `${n}`
}

// Full description for popup — qualification_summary first, then constructed fallback
function buildPopupDescription(lead: any): string | null {
  if (lead.qualification_summary) return lead.qualification_summary
  const name = lead.company_name ?? 'This company'
  const sentences: string[] = []
  const industry = lead.industry ? lead.industry.charAt(0).toUpperCase() + lead.industry.slice(1) : null
  const vertical = lead.vertical ? lead.vertical.charAt(0).toUpperCase() + lead.vertical.slice(1) : null
  if (industry && vertical && industry.toLowerCase() !== vertical.toLowerCase()) {
    sentences.push(`${name} is a ${industry} company operating in the ${vertical} vertical.`)
  } else if (industry) {
    sentences.push(`${name} is active in the ${industry} sector.`)
  } else if (vertical) {
    sentences.push(`${name} operates in the ${vertical} vertical.`)
  }
  const emp = fmtEmployees(lead.employee_count)
  if (emp && lead.revenue_range) sentences.push(`${emp} employees with ${lead.revenue_range} in estimated annual revenue.`)
  else if (emp) sentences.push(`${emp} employees.`)
  else if (lead.revenue_range) sentences.push(`Estimated annual revenue of ${lead.revenue_range}.`)
  if (lead.founded_year) sentences.push(`Founded in ${lead.founded_year}.`)
  return sentences.length > 0 ? sentences.join(' ') : null
}

// Same fallback logic as the non-technical LeadCard, adapted to a compact one-liner
function buildMetaLine(lead: any): string | null {
  const emp = fmtEmployees(lead.employee_count)

  // Primary: revenue + employees (richest signal)
  const primary = [
    lead.revenue_range ?? null,
    emp ? `${emp} employees` : null,
  ].filter(Boolean)
  if (primary.length) return primary.join(' · ')

  // Fallback: construct from vertical/industry + country (mirrors buildFallbackDescription)
  const sector = lead.industry || lead.vertical
  if (sector && lead.hq_country) {
    return `${sector.charAt(0).toUpperCase() + sector.slice(1)} · ${lead.hq_country}`
  }
  if (sector) return `${sector.charAt(0).toUpperCase() + sector.slice(1)} sector`
  if (lead.domain) return lead.domain
  return null
}

export function RecentLeadsTable() {
  const { data: me } = useQuery({
    queryKey: ['security-me'],
    queryFn:  securityApi.getMe,
    staleTime: 300_000,
  })

  const storageKey = `mbody:spotlight-hidden:${me?.email ?? ''}`
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!me?.email) return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setHiddenIds(new Set(JSON.parse(stored)))
    } catch {}
  }, [me?.email, storageKey])

  function hideLead(id: string) {
    setHiddenIds(prev => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['recent-leads-dashboard'],
    queryFn: () => api.get('/leads?page_size=12&stage=mql,sql,qualification,needs_review').then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const leads: any[] = (data?.leads ?? [])
    .filter((l: any) => !hiddenIds.has(String(l.id)))
    .slice(0, 5)

  // Favourites & bookmarks — backend-persisted per user
  const qc = useQueryClient()

  const { data: favsData } = useQuery({
    queryKey: ['lead-favorites'],
    queryFn:  leadApi.getFavorites,
    staleTime: 60_000,
    enabled:  !!me?.email,
  })
  const { data: bmsData } = useQuery({
    queryKey: ['lead-bookmarks'],
    queryFn:  leadApi.getBookmarks,
    staleTime: 60_000,
    enabled:  !!me?.email,
  })

  const favIds  = new Set<string>(favsData?.lead_ids  ?? [])
  const bmIds   = new Set<string>(bmsData?.lead_ids   ?? [])

  const favMut = useMutation({
    mutationFn: (id: string) => leadApi.toggleFavorite(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['lead-favorites'] }),
  })
  const bmMut = useMutation({
    mutationFn: (id: string) => leadApi.toggleBookmark(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['lead-bookmarks'] }),
  })

  // Portal-based hover card — escapes overflow clipping on any ancestor
  const [hoveredLead, setHoveredLead] = useState<any | null>(null)
  const [portalPos, setPortalPos] = useState<{ x: number; y: number } | null>(null)
  const cellRefs   = useRef<Record<string, HTMLTableCellElement | null>>({})
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (closeTimer.current)  clearTimeout(closeTimer.current)
    if (switchTimer.current) clearTimeout(switchTimer.current)
  }, [])

  function cancelAll() {
    if (closeTimer.current)  clearTimeout(closeTimer.current)
    if (switchTimer.current) clearTimeout(switchTimer.current)
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => {
      setHoveredLead(null)
      setPortalPos(null)
    }, 150)
  }
  function showPopupForLead(lead: any) {
    setHoveredLead(lead)
    const cell = cellRefs.current[String(lead.id)]
    if (cell) {
      const r = cell.getBoundingClientRect()
      setPortalPos({ x: r.left, y: r.top })
    }
  }

  function handleRowEnter(lead: any) {
    cancelAll()
    // Popup already visible for a different lead → debounce the switch so the
    // mouse can pass through an intervening row while heading to the popup
    if (hoveredLead && String(hoveredLead.id) !== String(lead.id)) {
      switchTimer.current = setTimeout(() => showPopupForLead(lead), 250)
    } else {
      showPopupForLead(lead)
    }
  }
  function handleRowLeave() {
    if (switchTimer.current) clearTimeout(switchTimer.current)
    scheduleClose()
  }

  return (
    <CardShell className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Pipeline Spotlight</p>
        <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">Top leads and deals surfaced for your pipeline</p>
      </div>

      {/* Table */}
      <div className="px-4 pb-4 pt-3">
        <div className="rounded-md overflow-hidden bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-100 dark:bg-neutral-800 border-b border-stone-200 dark:border-neutral-800">
                {HEADERS.map((h, i) => (
                  <th key={i} className={cn(
                    'py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap',
                    i === HEADERS.length - 1 ? 'px-2' : 'px-4',
                  )}>
                    {h.infoBefore ? (
                      <div className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        {h.label}
                      </div>
                    ) : h.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">Loading…</td>
                </tr>
              )}
              {!isLoading && leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400 dark:text-slate-500">No leads in spotlight</td>
                </tr>
              )}

              {leads.map(lead => {
                const location = [lead.hq_city, lead.hq_state, lead.hq_country].filter(Boolean).join(', ')
                const metaLine = buildMetaLine(lead)

                return (
                  <tr
                    key={lead.id}
                    onMouseEnter={() => handleRowEnter(lead)}
                    onMouseLeave={handleRowLeave}
                    onClick={() => { window.location.href = `/leads?highlight=${lead.id}` }}
                    className="group border-b border-stone-100 dark:border-neutral-800 last:border-b-0 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    {/* Company — ref used to anchor the portal popup */}
                    <td
                      ref={el => { cellRefs.current[String(lead.id)] = el }}
                      className="px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        {/* Avatar with optional pink heart badge */}
                        <div className="relative flex-shrink-0">
                          <CompanyAvatar name={lead.company_name} domain={lead.domain ?? ''} size="xxs" circle />
                          {favIds.has(String(lead.id)) && (
                            <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white dark:bg-neutral-900 ring-1 ring-white dark:ring-neutral-900">
                              <Heart className="h-2 w-2 text-pink-500 fill-pink-500" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                          {lead.company_name}
                        </span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3">
                      {metaLine ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <span className="w-5 h-5 flex items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-500 dark:text-violet-400 flex-shrink-0">
                            <BadgeInfo size={14} />
                          </span>
                          <span className="truncate max-w-[130px]">{metaLine}</span>
                        </div>
                      ) : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Industry */}
                    <td className="px-4 py-3">
                      {(lead.industry || lead.vertical) ? (
                        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <span className="w-5 h-5 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex-shrink-0">
                            <LibraryBig size={14} />
                          </span>
                          <span className="truncate max-w-[90px]">
                            {(lead.industry || lead.vertical).charAt(0).toUpperCase() + (lead.industry || lead.vertical).slice(1)}
                          </span>
                        </div>
                      ) : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3">
                      {location ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                          <span className="truncate max-w-[90px]">{location}</span>
                        </div>
                      ) : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Row actions menu */}
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      <RowMenu
                        isFavorited={favIds.has(String(lead.id))}
                        isBookmarked={bmIds.has(String(lead.id))}
                        onHide={() => hideLead(String(lead.id))}
                        onToggleFavorite={() => favMut.mutate(String(lead.id))}
                        onToggleBookmark={() => bmMut.mutate(String(lead.id))}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end px-4 pt-2 pb-3">
        <Link
          href="/leads"
          className="flex items-center gap-1 text-xs font-normal text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {/* Contact popup — rendered via portal so it escapes overflow clipping */}
      {hoveredLead && portalPos && createPortal(
        <LeadContactPopup
          lead={hoveredLead}
          x={portalPos.x}
          y={portalPos.y}
          onMouseEnter={cancelAll}
          onMouseLeave={scheduleClose}
        />,
        document.body,
      )}
    </CardShell>
  )
}

function RowMenu({
  isFavorited, isBookmarked, onHide, onToggleFavorite, onToggleBookmark,
}: {
  isFavorited:      boolean
  isBookmarked:     boolean
  onHide:           () => void
  onToggleFavorite: () => void
  onToggleBookmark: () => void
}) {
  const [open, setOpen]         = useState(false)
  const [flipDown, setFlipDown] = useState(false)
  const ref    = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open && btnRef.current) {
      setFlipDown(btnRef.current.getBoundingClientRect().top < 180)
    }
    setOpen(p => !p)
  }

  const itemCls = 'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors rounded-lg'

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={toggle}
        className={cn(
          'opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-lg transition-all',
          open ? 'opacity-100 bg-stone-100 dark:bg-neutral-800 text-slate-600' : 'text-slate-400 hover:bg-stone-100 dark:hover:bg-neutral-800',
        )}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div className={cn(
          'absolute right-0 z-50 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-lg p-1 min-w-[175px]',
          flipDown ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
        )}>
          {/* Remove from spotlight */}
          <button
            onClick={() => { onHide(); setOpen(false) }}
            className={cn(itemCls, 'text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30')}
          >
            <Minus className="h-3.5 w-3.5 flex-shrink-0" />
            Remove from spotlight
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-neutral-800" />

          {/* Favourite */}
          <button
            onClick={() => { onToggleFavorite(); setOpen(false) }}
            className={cn(itemCls, isFavorited && 'text-pink-500 dark:text-pink-400')}
          >
            <Heart className={cn('h-3.5 w-3.5 flex-shrink-0', isFavorited && 'fill-pink-500 text-pink-500 dark:fill-pink-400 dark:text-pink-400')} />
            {isFavorited ? 'Remove from favourites' : 'Add to favourites'}
          </button>

          {/* Bookmark */}
          <button
            onClick={() => { onToggleBookmark(); setOpen(false) }}
            className={cn(itemCls, isBookmarked && 'text-blue-500 dark:text-blue-400')}
          >
            <Bookmark className={cn('h-3.5 w-3.5 flex-shrink-0', isBookmarked && 'fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400')} />
            {isBookmarked ? 'Remove bookmark' : 'Add to bookmarks'}
          </button>
        </div>
      )}
    </div>
  )
}

function LeadContactPopup({
  lead, x, y, onMouseEnter, onMouseLeave,
}: {
  lead: any; x: number; y: number
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const contacts: any[] = lead.contacts ?? []
  const [idx, setIdx] = useState(0)
  const contact = contacts[idx] ?? null
  const total   = contacts.length
  const description = buildPopupDescription(lead)

  return (
    <div
      className="fixed z-[9999]"
      style={{ left: x, top: y, transform: 'translateY(calc(-100% - 10px))' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-md px-3 py-2.5 select-none min-w-[240px] max-w-[280px] space-y-2">

        {/* Company description */}
        {description && (
          <>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{description}</p>
              <a
                href={`/leads?highlight=${lead.id}`}
                className="text-[11px] font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                See more →
              </a>
            </div>
            <div className="border-t border-slate-100 dark:border-neutral-800" />
          </>
        )}

        {/* Current contact */}
        {contact ? (
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{contact.name}</p>
            {contact.title && <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{contact.title}</p>}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">No contact on file</p>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {lead.domain && (
            <a href={`https://${lead.domain}`} target="_blank" rel="noopener noreferrer" title={lead.domain}
              className="w-5 h-5 flex items-center justify-center rounded-md bg-blue-100 dark:bg-zinc-700/40 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity">
              <Earth className="h-3.5 w-3.5" />
            </a>
          )}
          {contact?.linkedin_url && (
            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer"
              title={contact.name ? `${contact.name} on LinkedIn` : 'LinkedIn'}
              className="w-5 h-5 flex items-center justify-center rounded-md bg-blue-100 dark:bg-zinc-700/40 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity">
              <img src="/linkedin.svg" className="h-4 w-4" alt="LinkedIn" />
            </a>
          )}
          {lead.hq_phone && (
            <a href={`tel:${lead.hq_phone}`} title={lead.hq_phone}
              className="w-5 h-5 flex items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:opacity-80 transition-opacity">
              <Phone className="h-3 w-3" />
            </a>
          )}
          {contact?.email && (
            <a href={`mailto:${contact.email}`} title={contact.email}
              className="w-5 h-5 flex items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:opacity-80 transition-opacity">
              <Mail className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Footer: contact count + pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
              <UsersRound className="h-3 w-3" />
              <span>{total} contact{total !== 1 ? 's' : ''}</span>
            </div>
            {total > 1 && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={e => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)) }}
                  disabled={idx === 0}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setIdx(i => Math.min(total - 1, i + 1)) }}
                  disabled={idx === total - 1}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Arrow pointing down toward the row */}
      <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white dark:bg-neutral-900 border-r border-b border-slate-200 dark:border-neutral-700 rotate-45" />
    </div>
  )
}
