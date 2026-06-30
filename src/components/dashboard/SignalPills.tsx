'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Construction, Hammer, Handshake, Users, DollarSign, Zap, Newspaper,
  ChevronLeft, ChevronRight, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import CompanyAvatar from '@/components/leads/CompanyAvatar'

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface MarketSignal {
  lead_id:     string
  company_name: string
  domain:       string
  title:        string
  summary:      string | null
  article_date: string | null
  signal_type:  string
  sentiment:    string | null
  url:          string | null
}

/* ── Signal-type config ──────────────────────────────────────────────────── */

const STONE_PILL = 'border-stone-200 bg-stone-50 text-stone-700 dark:bg-neutral-800/60 dark:border-neutral-700 dark:text-slate-300'

const SIGNAL_CONFIG: Record<string, {
  label: string
  dot:   string
  badge: string
  Icon:  React.ElementType
}> = {
  expansion:        { label: 'Expansion',   dot: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',  Icon: Construction },
  renovation:       { label: 'Renovation',  dot: 'bg-rose-500',  badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',  Icon: Hammer     },
  acquisition:      { label: 'Acquisition', dot: 'bg-pink-500',  badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400',  Icon: Zap        },
  investment:       { label: 'Investment',  dot: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',  Icon: DollarSign },
  partnership:      { label: 'Partnership', dot: 'bg-rose-500',  badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',  Icon: Handshake  },
  leadership_change:{ label: 'Leadership',  dot: 'bg-pink-500',  badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400',  Icon: Users      },
}

const FALLBACK_CONFIG = {
  label: 'Signal',
  dot:   'bg-stone-400',
  badge: 'bg-stone-100 text-stone-600',
  Icon:  Zap,
}

function cfg(type: string) { return SIGNAL_CONFIG[type] ?? FALLBACK_CONFIG }

/* ── Expandable summary ──────────────────────────────────────────────────── */

function SummaryWithMore({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="relative">
      <p className={cn('text-xs text-slate-500 dark:text-slate-400 leading-relaxed', !expanded && 'line-clamp-4')}>
        {text}
      </p>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="absolute bottom-0.5 right-0 text-blue-500 dark:text-blue-400 text-xs font-medium bg-white dark:bg-neutral-900 pl-1 hover:underline"
        >
          see more
        </button>
      ) : (
        <button
          onClick={() => setExpanded(false)}
          className="absolute bottom-0.5 right-0 w-5 h-5 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 hover:opacity-80 transition-opacity"
        >
          <ChevronUp size={11} />
        </button>
      )}
    </div>
  )
}

/* ── Hover popup ─────────────────────────────────────────────────────────── */

function SignalPopup({
  signal, pos,
  onEnter, onLeave,
}: {
  signal: MarketSignal
  pos:    { x: number; y: number }
  onEnter: () => void
  onLeave:  () => void
}) {
  const { label, badge, Icon } = cfg(signal.signal_type)
  const dateStr = signal.article_date
    ? new Date(signal.article_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return createPortal(
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, width: 300 }}
      className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl shadow-xl p-4 flex flex-col gap-3"
    >
      {/* Company */}
      <div className="flex items-center gap-2">
        <CompanyAvatar name={signal.company_name} domain={signal.domain ?? ''} size="xs" circle />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{signal.company_name}</span>
      </div>

      {/* Badge + date */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', badge)}>
          <Icon size={10} strokeWidth={2} />
          {label}
        </span>
        {dateStr && (
          <span className="text-[11px] text-slate-600 dark:text-slate-400">{dateStr}</span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
        {signal.title}
      </p>

      {/* Summary */}
      {signal.summary && <SummaryWithMore text={signal.summary} />}

      {/* Read link */}
      {signal.url && (
        <a
          href={signal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 transition-colors"
        >
          Follow Article <Newspaper size={11} strokeWidth={2} />
        </a>
      )}
    </div>,
    document.body,
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function SignalPills({
  signals,
  loading,
}: {
  signals: MarketSignal[]
  loading: boolean
}) {
  const [hovered, setHovered] = useState<MarketSignal | null>(null)
  const [pos, setPos]         = useState<{ x: number; y: number } | null>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const pillRefs   = useRef<Record<string, HTMLButtonElement | null>>({})
  const scrollRef  = useRef<HTMLDivElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const syncArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    syncArrows()
    const el = scrollRef.current
    el?.addEventListener('scroll', syncArrows, { passive: true })
    window.addEventListener('resize', syncArrows)
    return () => {
      el?.removeEventListener('scroll', syncArrows)
      window.removeEventListener('resize', syncArrows)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [signals, syncArrows])

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => { setHovered(null); setPos(null) }, 150)
  }
  function showFor(signal: MarketSignal) {
    cancelClose()
    setHovered(signal)
    const el = pillRefs.current[signal.lead_id + signal.url]
    if (el) {
      const r = el.getBoundingClientRect()
      const topOffset = r.top > 180 ? r.top - 290 : r.bottom + 8
      setPos({ x: r.left, y: topOffset })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-7 rounded-full bg-slate-100 dark:bg-neutral-800 animate-pulse flex-shrink-0"
            style={{ width: 130 + (i % 3) * 25 }}
          />
        ))}
      </div>
    )
  }

  if (!signals.length) return null

  return (
    <>
      <div className="relative flex items-center gap-1">

        {/* Left arrow */}
        {canLeft && (
          <button
            onClick={() => scroll('left')}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 shadow-sm transition-colors z-10"
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
        )}

        {/* Pills track — overflow hidden, no scrollbar */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 pt-2 pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {signals.map(signal => {
            const { dot, Icon, label } = cfg(signal.signal_type)
            const key = signal.lead_id + signal.url

            return (
              <button
                key={key}
                ref={el => { pillRefs.current[key] = el }}
                onMouseEnter={() => showFor(signal)}
                onMouseLeave={scheduleClose}
                className={cn(
                  'relative flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5',
                  'rounded-full border text-xs font-medium cursor-default',
                  'transition-all duration-150 hover:brightness-95',
                  STONE_PILL,
                )}
              >
                {/* Type dot — top-right corner */}
                <span className={cn('absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900', dot)} />
                <Icon size={11} strokeWidth={2.5} className="flex-shrink-0 opacity-50" />
                <span className="font-semibold truncate max-w-[110px]">{signal.company_name}</span>
                <span className="opacity-40">·</span>
                <span className="font-normal opacity-60">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Right arrow */}
        {canRight && (
          <button
            onClick={() => scroll('right')}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 shadow-sm transition-colors z-10"
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      {hovered && pos && (
        <SignalPopup
          signal={hovered}
          pos={pos}
          onEnter={cancelClose}
          onLeave={scheduleClose}
        />
      )}
    </>
  )
}
