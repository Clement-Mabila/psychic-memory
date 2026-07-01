'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Construction, Hammer, Handshake, Users, DollarSign, Zap, CircleStar,
  ChevronLeft, ChevronRight, ChevronUp, AudioLines,
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

const SIGNAL_CONFIG: Record<string, {
  label:  string
  dot:    string
  badge:  string
  border: string
  Icon:   React.ElementType
}> = {
  expansion:        { label: 'Expansion',   dot: 'bg-pink-500',   badge: 'bg-pink-50 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',    border: 'border-pink-200 dark:border-pink-800',   Icon: Construction },
  renovation:       { label: 'Renovation',  dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-800',  Icon: Hammer       },
  acquisition:      { label: 'Acquisition', dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-800',   Icon: Zap          },
  investment:       { label: 'Investment',  dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', Icon: DollarSign },
  partnership:      { label: 'Partnership', dot: 'bg-fuchsia-500', badge: 'bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800', Icon: Handshake },
  leadership_change:{ label: 'Leadership',  dot: 'bg-violet-500',    badge: 'bg-violet-50 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',      border: 'border-violet-200 dark:border-violet-800',     Icon: Users        },
}

const FALLBACK_CONFIG = {
  label:  'Signal',
  dot:    'bg-stone-400',
  badge:  'bg-stone-100 text-stone-700',
  border: 'border-stone-200 dark:border-neutral-700',
  Icon:   Zap,
}

function cfg(type: string) { return SIGNAL_CONFIG[type] ?? FALLBACK_CONFIG }

/* ── Expandable summary ──────────────────────────────────────────────────── */

function SummaryWithMore({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="relative">
      <p className={cn('text-xs text-slate-500 dark:text-slate-400 leading-relaxed', !expanded && 'line-clamp-3')}>
        {text}
      </p>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="absolute bottom-0.5 right-0 text-slate-600 dark:text-slate-400 text-xs font-medium bg-white dark:bg-neutral-900 pl-1 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
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

  const POPUP_W = 300
  const flipLeft = pos.x + POPUP_W + 16 > window.innerWidth
  const left = flipLeft ? Math.max(8, pos.x - POPUP_W) : pos.x

  return createPortal(
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ position: 'fixed', left, top: pos.y, zIndex: 9999, width: POPUP_W }}
      className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-md p-4 flex flex-col gap-2.5"
    >
      {/* Company */}
      <div className="flex items-center gap-2">
        <CompanyAvatar name={signal.company_name} domain={signal.domain ?? ''} size="xxs" circle />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{signal.company_name}</span>
      </div>

      {/* Badge + date */}
      <div className="flex items-center gap-2 mt-1 mb-1">
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md', badge)}>
          <Icon size={10} strokeWidth={2} />
          {label}
        </span>
        {dateStr && (
          <span className="text-xs text-slate-800 dark:text-slate-500">{dateStr}</span>
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 transition-colors pt-2 mt-0.5 border-t border-gray-100 dark:border-neutral-800"
        >
          <CircleStar size={14} strokeWidth={2} />
          Follow article
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
            const { dot, Icon, label, badge, border } = cfg(signal.signal_type)
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
                  'transition-all duration-150 hover:brightness-95 shadow-sm',
                  badge, border,
                )}
              >
                {/* Pulsing live indicator — top-right corner */}
                <span className={cn('absolute -top-1.5 -right-1 flex items-center justify-center w-4 h-4 rounded-full ring-2 ring-white dark:ring-neutral-900', dot)}>
                  <AudioLines size={13} strokeWidth={2} color="white" />
                </span>
                <Icon size={11} strokeWidth={2.5} className="flex-shrink-0" />
                <span className="font-semibold truncate max-w-[110px]">{signal.company_name}</span>
                <span className="opacity-50">·</span>
                <span className="font-normal">{label}</span>
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