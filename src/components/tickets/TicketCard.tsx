'use client'

import { type ElementType } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  Database, MessageCircle, TriangleAlert, Shield,
  Pencil, Key, Lightbulb, AlertCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TicketListItem {
  id:              string
  short_id:        string
  ticket_type:     string
  subject:         string
  priority:        string
  status:          string
  submitter_email: string
  submitter_role:  string
  sla_deadline:    string | null
  sla_breached:    boolean
  is_duplicate:    boolean
  comment_count:   number
  created_at:      string
  updated_at:      string
}

// ── Config maps ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: ElementType; color: string; label: string }> = {
  data_request:      { icon: Database,       color: 'text-blue-500',     label: 'Data Request'    },
  general_enquiry:   { icon: MessageCircle,  color: 'text-violet-500',   label: 'General Enquiry' },
  bug_report:        { icon: TriangleAlert,  color: 'text-red-500',      label: 'Bug Report'      },
  data_removal_gdpr: { icon: Shield,         color: 'text-orange-500',   label: 'GDPR Removal'    },
  data_correction:   { icon: Pencil,         color: 'text-emerald-500',  label: 'Data Correction' },
  access_request:    { icon: Key,            color: 'text-amber-500',    label: 'Access Request'  },
  feature_request:   { icon: Lightbulb,      color: 'text-purple-500',   label: 'Feature Request' },
  missing_info:      { icon: AlertCircle,    color: 'text-amber-400',    label: 'Missing Info'    },
}

const STATUS_DOT: Record<string, string> = {
  open:           'bg-amber-400',
  auto_responded: 'bg-blue-400 animate-pulse',
  in_review:      'bg-blue-400',
  resolved:       'bg-emerald-400',
  closed:         'bg-slate-300 dark:bg-neutral-600',
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  open:           { text: 'Open',         color: 'text-amber-500 dark:text-amber-400'           },
  auto_responded: { text: 'AI Responded', color: 'text-blue-500 dark:text-blue-400'             },
  in_review:      { text: 'In Review',    color: 'text-blue-600 dark:text-blue-400'             },
  resolved:       { text: 'Resolved',     color: 'text-cyan-500 dark:text-cyan-400'             },
  closed:         { text: 'Closed',       color: 'text-slate-400 dark:text-slate-500'           },
}

const PRIORITY_BADGE: Record<string, string | null> = {
  urgent: 'bg-red-600 text-white',
  high:   'bg-orange-500 text-white',
  medium: null,
  low:    null,
}

// ── TicketCard ────────────────────────────────────────────────────────────────

interface TicketCardProps {
  ticket:  TicketListItem
  onClick: (ticket: TicketListItem) => void
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const typeConf   = TYPE_CONFIG[ticket.ticket_type] ?? TYPE_CONFIG.general_enquiry
  const Icon       = typeConf.icon
  const dotCls     = STATUS_DOT[ticket.status]  ?? 'bg-slate-300'
  const statusConf = STATUS_LABEL[ticket.status] ?? { text: ticket.status, color: 'text-slate-400' }
  const priCls     = PRIORITY_BADGE[ticket.priority] ?? null

  const isActive = ticket.status === 'open' || ticket.status === 'auto_responded' || ticket.status === 'in_review'

  return (
    <div
      onClick={() => onClick(ticket)}
      className={cn(
        'flex items-start gap-4 px-5 py-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-2xl shadow-sm dark:shadow-none transition-shadow cursor-pointer',
        isActive ? 'hover:shadow-md dark:hover:shadow-none' : 'opacity-80 hover:opacity-100 hover:shadow-md dark:hover:shadow-none',
      )}
    >
      {/* ── Left: type icon ── */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="w-11 h-11 flex items-center justify-center">
          <Icon size={17} className={typeConf.color} strokeWidth={1.75} />
        </div>
      </div>

      {/* ── Center ── */}
      <div className="flex-1 min-w-0">

        {/* Top row: type label · timestamp · badges */}
        <div className="flex items-center gap-2 flex-wrap mb-0">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{typeConf.label}</span>
            {' · '}
            {ticket.created_at ? formatRelativeTime(ticket.created_at) : '—'}
            {ticket.status === 'auto_responded' && (
              <span className="ml-1 text-blue-500 dark:text-blue-400 font-medium">· awaiting review</span>
            )}
          </p>

          {/* Priority badge — urgent and high only */}
          {priCls && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 mb-1.5 rounded-full', priCls)}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
            </span>
          )}

          {/* SLA breached badge */}
          {ticket.sla_breached && (
            <span className="text-xs font-semibold px-2 py-0.5 mb-1.5 rounded-full bg-red-600 text-white">
              SLA Breached
            </span>
          )}

          {/* Duplicate badge */}
          {ticket.is_duplicate && (
            <span className="text-xs font-semibold px-2 py-0.5 mb-1.5 rounded-full bg-amber-500 text-white">
              Duplicate
            </span>
          )}
        </div>

        {/* Main sentence — subject + status label */}
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{ticket.subject}</span>
          {' '}
          <span className={cn('font-semibold text-xs', statusConf.color)}>
            {statusConf.text}
          </span>
        </p>

        {/* Submitter — own line, like cost in AgentCard */}
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
          {ticket.submitter_email || '—'}
          {ticket.submitter_role ? (
            <span className="font-normal text-slate-500 dark:text-slate-400">
              {' · '}{ticket.submitter_role}
            </span>
          ) : null}
        </p>

        {/* Stats detail — like critic detail */}
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
          #{ticket.short_id}
          {ticket.comment_count > 0 && ` · ${ticket.comment_count} message${ticket.comment_count !== 1 ? 's' : ''}`}
          {ticket.sla_deadline && !ticket.sla_breached && (
            <span className="text-slate-400 dark:text-slate-500">
              {' · SLA '}{new Date(ticket.sla_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </p>

        {/* SLA breach — like error_message */}
        {ticket.sla_breached && (
          <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-2 font-medium mt-0.5">
            <TriangleAlert className="flex-shrink-0 w-3.5 h-3.5" />
            SLA deadline exceeded — immediate attention required
          </p>
        )}
      </div>

      {/* ── Right: status dot ── */}
      <div className="flex-shrink-0 self-center">
        <span className={cn('w-2.5 h-2.5 rounded-full block', dotCls)} />
      </div>
    </div>
  )
}
