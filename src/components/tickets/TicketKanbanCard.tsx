'use client'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { MessageCircle, TriangleAlert, Database, Shield, Pencil, Key, Lightbulb, AlertCircle } from 'lucide-react'
import type { TicketListItem } from './TicketCard'

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  data_request:      { label: 'Data Request',    color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'         },
  general_enquiry:   { label: 'General Enquiry', color: 'bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400' },
  bug_report:        { label: 'Bug Report',      color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'             },
  data_removal_gdpr: { label: 'GDPR Removal',    color: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400' },
  data_correction:   { label: 'Data Correction', color: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' },
  access_request:    { label: 'Access Request',  color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'     },
  feature_request:   { label: 'Feature Request', color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' },
  missing_info:      { label: 'Missing Info',    color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'     },
}

const PRIORITY_BADGE: Record<string, string | null> = {
  urgent: 'bg-red-600 text-white',
  high:   'bg-orange-500 text-white',
  medium: null,
  low:    null,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local
    .split(/[._-]/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

// ── TicketKanbanCard ──────────────────────────────────────────────────────────

interface TicketKanbanCardProps {
  ticket:  TicketListItem
  onClick: (ticket: TicketListItem) => void
}

export function TicketKanbanCard({ ticket, onClick }: TicketKanbanCardProps) {
  const typeConf = TYPE_CONFIG[ticket.ticket_type] ?? TYPE_CONFIG.general_enquiry
  const priCls   = PRIORITY_BADGE[ticket.priority] ?? null

  return (
    <div
      onClick={() => onClick(ticket)}
      className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all"
    >
      {/* Top badges row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', typeConf.color)}>
          {typeConf.label}
        </span>
        {priCls && (
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', priCls)}>
            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
          </span>
        )}
        {ticket.sla_breached && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
            SLA Breached
          </span>
        )}
      </div>

      {/* Subject */}
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 mb-1.5">
        {ticket.subject}
      </p>

      {/* SLA warning */}
      {ticket.sla_breached && (
        <div className="flex items-center gap-1 text-red-500 dark:text-red-400 mb-2">
          <TriangleAlert size={11} className="flex-shrink-0" />
          <span className="text-[10px] font-medium">Deadline exceeded</span>
        </div>
      )}

      {/* Bottom row: avatar + name · role · comment count · SLA date */}
      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-50 dark:border-slate-800">
        <Avatar
          email={ticket.submitter_email}
          name={nameFromEmail(ticket.submitter_email)}
          size="xs"
        />
        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1 leading-none">
          {nameFromEmail(ticket.submitter_email)}
          {ticket.submitter_role ? (
            <span className="text-slate-400 dark:text-slate-500"> · {ticket.submitter_role}</span>
          ) : null}
        </span>
        {ticket.comment_count > 0 && (
          <div className="flex items-center gap-0.5 text-slate-400 dark:text-slate-500 flex-shrink-0">
            <MessageCircle size={11} />
            <span className="text-[10px]">{ticket.comment_count}</span>
          </div>
        )}
        {ticket.sla_deadline && !ticket.sla_breached && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
            {new Date(ticket.sla_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  )
}
