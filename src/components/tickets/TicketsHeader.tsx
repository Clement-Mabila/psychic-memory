'use client'

import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'
import type { TicketListItem } from './TicketCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TicketsHeaderProps {
  tickets:          TicketListItem[]
  statusFilter:     string
  priorityFilter:   string
  onStatusFilter:   (s: string) => void
  onPriorityFilter: (p: string) => void
}

const STATUS_FILTERS = [
  { value: '',              label: 'All'          },
  { value: 'open',          label: 'Open'         },
  { value: 'auto_responded',label: 'AI Responded' },
  { value: 'in_review',     label: 'In Review'    },
  { value: 'resolved',      label: 'Resolved'     },
  { value: 'closed',        label: 'Closed'       },
]

const PRIORITY_FILTERS = [
  { value: '',       label: 'All priority' },
  { value: 'urgent', label: 'Urgent'       },
  { value: 'high',   label: 'High'         },
  { value: 'sla',    label: 'SLA Breached' },
]

// ── TicketsHeader ─────────────────────────────────────────────────────────────

export function TicketsHeader({
  tickets,
  statusFilter,
  priorityFilter,
  onStatusFilter,
  onPriorityFilter,
}: TicketsHeaderProps) {
  const total        = tickets.length
  const openCount    = tickets.filter(t => t.status === 'open').length
  const inReview     = tickets.filter(t => t.status === 'in_review').length
  const autoResp     = tickets.filter(t => t.status === 'auto_responded').length
  const slaCount     = tickets.filter(t => t.sla_breached).length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length

  const hasLive = openCount > 0 || autoResp > 0 || inReview > 0

  return (
    <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 dark:border-slate-800">

      {/* ── Title row (mirrors AgentLogsHeader exactly) ── */}
      <div className="flex items-center gap-3 mb-1">
        <Inbox
          size={16}
          className={cn('text-violet-500', hasLive && 'animate-pulse')}
          strokeWidth={1.75}
        />
        <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Support Tickets
        </h1>
        {hasLive && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Active
          </span>
        )}
        {slaCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
            {slaCount} SLA breached
          </span>
        )}
      </div>

      {/* ── Stats row (mirrors AgentLogsHeader exactly) ── */}
      {total > 0 && (
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">{total} tickets</span>
          {openCount > 0 && (
            <>
              <span className="text-slate-200 dark:text-slate-700">·</span>
              <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">{openCount} open</span>
            </>
          )}
          {autoResp > 0 && (
            <>
              <span className="text-slate-200 dark:text-slate-700">·</span>
              <span className="text-xs text-blue-500 dark:text-blue-400">{autoResp} awaiting review</span>
            </>
          )}
          {inReview > 0 && (
            <>
              <span className="text-slate-200 dark:text-slate-700">·</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">{inReview} in review</span>
            </>
          )}
          {resolvedCount > 0 && (
            <>
              <span className="text-slate-200 dark:text-slate-700">·</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{resolvedCount} resolved</span>
            </>
          )}
        </div>
      )}

      {/* ── Filter chips ── */}
      <div className="flex items-center gap-4 mt-3">
        {/* Status filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onStatusFilter(f.value)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full transition-colors',
                statusFilter === f.value
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />

        {/* Priority / SLA filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {PRIORITY_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onPriorityFilter(f.value)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full transition-colors',
                priorityFilter === f.value
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
