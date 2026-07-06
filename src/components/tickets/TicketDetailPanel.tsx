'use client'
import { type ReactNode, type ElementType, useState, useEffect, useCallback } from 'react'
import {
  // Structural (shared with EmailIntelligencePanel)
  MoreHorizontal, CheckCircle2, AlertCircle, Clock,
  Loader2, XCircle, TriangleAlert, ChevronDown, Calendar,
  CircleDashed, Target, Flag, Flame, RefreshCw,
  // Ticket-specific
  Database, MessageCircle, Shield, Pencil, Key, Lightbulb,
  Lock, Bot, Send, ExternalLink, Building2, User, BadgeCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'
import Cookies from 'js-cookie'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TicketComment {
  id:           string
  author_email: string
  body:         string
  comment_type: 'reply' | 'internal_note' | 'system_event' | 'llm_response'
  created_at:   string
}

interface EntityRef {
  type:  'lead' | 'contact' | 'user'
  id:    string | number
  label: string
  url:   string
}

interface MissingField {
  field:    string
  label:    string
  editable: boolean
}

export interface TicketDetail {
  id:              string
  short_id:        string
  ticket_type:     string
  subject:         string
  body:            string
  priority:        'low' | 'medium' | 'high' | 'urgent'
  status:          'open' | 'auto_responded' | 'in_review' | 'resolved' | 'closed'
  submitted_by:    number | null
  submitter_email: string
  submitter_role:  string
  assigned_to:     number | null
  resolved_by:     number | null
  resolved_at:     string | null
  sla_deadline:    string | null
  sla_breached:    boolean
  is_duplicate:    boolean
  duplicate_of:    string | null
  metadata: {
    entity_refs?:        EntityRef[]
    missing_fields?:     MissingField[]
    auto_priority_reason?: string
    extracted_entities?: Record<string, unknown>
    [key: string]: unknown
  }
  created_at: string
  updated_at: string
  comments:   TicketComment[]
}

type TicketTab = 'overview' | 'thread' | 'refs' | 'history'

// ── API helper ────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = Cookies.get('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchTicket(id: string): Promise<TicketDetail> {
  const { data } = await axios.get(`/api/tickets/${id}/`, { headers: authHeaders() })
  return data
}

async function patchTicket(id: string, payload: Record<string, unknown>): Promise<TicketDetail> {
  const { data } = await axios.patch(`/api/tickets/${id}/`, payload, { headers: authHeaders() })
  return data
}

async function postComment(id: string, body: string, commentType: string): Promise<void> {
  await axios.post(`/api/tickets/${id}/comments/`, { body, comment_type: commentType }, { headers: authHeaders() })
}

// ── Ticket type config ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: ElementType; bg: string; label: string }> = {
  data_request:      { icon: Database,       bg: 'bg-blue-500',   label: 'Data Request'     },
  general_enquiry:   { icon: MessageCircle,  bg: 'bg-violet-500', label: 'General Enquiry'  },
  bug_report:        { icon: TriangleAlert,  bg: 'bg-red-500',    label: 'Bug Report'       },
  data_removal_gdpr: { icon: Shield,         bg: 'bg-orange-500', label: 'GDPR Removal'     },
  data_correction:   { icon: Pencil,         bg: 'bg-emerald-500',label: 'Data Correction'  },
  access_request:    { icon: Key,            bg: 'bg-amber-500',  label: 'Access Request'   },
  feature_request:   { icon: Lightbulb,      bg: 'bg-purple-500', label: 'Feature Request'  },
  missing_info:      { icon: AlertCircle,    bg: 'bg-amber-400',  label: 'Missing Info'     },
}

const PRIORITY_CONFIG: Record<string, { icon: ElementType; color: string; chipCls: string; label: string }> = {
  urgent: { icon: Flame,         color: 'bg-red-500',    chipCls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',       label: 'Urgent' },
  high:   { icon: Flag,          color: 'bg-orange-500', chipCls: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400', label: 'High'   },
  medium: { icon: Target,        color: 'bg-blue-500',   chipCls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',   label: 'Medium' },
  low:    { icon: CircleDashed,  color: 'bg-slate-400',  chipCls: 'border border-gray-200 text-slate-500 dark:border-neutral-700 dark:text-slate-400', label: 'Low'    },
}

const STATUS_CONFIG: Record<string, { label: string; chipCls: string }> = {
  open:           { label: 'Open',           chipCls: 'border border-slate-400 dark:border-neutral-600 text-slate-600 dark:text-slate-400' },
  auto_responded: { label: 'Auto Responded', chipCls: 'border border-blue-400 dark:border-blue-700 text-blue-600 dark:text-blue-400'      },
  in_review:      { label: 'In Review',      chipCls: 'border border-amber-400 dark:border-amber-700 text-amber-600 dark:text-amber-400'  },
  resolved:       { label: 'Resolved',       chipCls: 'border border-green-400 dark:border-green-700 text-green-600 dark:text-green-400'  },
  closed:         { label: 'Closed',         chipCls: 'border border-slate-300 dark:border-neutral-700 text-slate-400 dark:text-slate-500'},
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...opts })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function initials(email: string) {
  const parts = email.split('@')[0]?.split(/[._-]/) ?? []
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  return d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function OverviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs mb-1 text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{value}</span>
    </div>
  )
}

// ── TicketTypeIcon (replaces Avatar) ──────────────────────────────────────────

function TicketTypeIcon({ type, priority }: { type: string; priority: string }) {
  const typeConf     = TYPE_CONFIG[type] ?? TYPE_CONFIG.general_enquiry
  const priorityConf = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.low
  const TIcon  = typeConf.icon
  const PIcon  = priorityConf.icon
  return (
    <div className="relative flex-shrink-0 -mt-12">
      <div className={cn('w-24 h-24 rounded-full ring-4 ring-white dark:ring-neutral-900 flex items-center justify-center', typeConf.bg)}>
        <TIcon className="h-10 w-10 text-white" strokeWidth={1.5} />
      </div>
      <div className={cn('absolute bottom-1 right-1 w-[26px] h-[26px] rounded-full flex items-center justify-center ring-2 ring-white dark:ring-neutral-900', priorityConf.color)}>
        <PIcon className="h-3.5 w-3.5 text-white" />
      </div>
    </div>
  )
}

// ── TicketInfoPanel (replaces LeadOverviewPanel) ──────────────────────────────

function TicketInfoPanel({ ticket }: { ticket: TicketDetail }) {
  const priorityConf = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.low
  const PIcon = priorityConf.icon
  const slaDate = ticket.sla_deadline ? new Date(ticket.sla_deadline) : null
  const isPast  = slaDate ? slaDate.getTime() < Date.now() : false

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl sticky top-4">
      <div className="px-5 pt-5 pb-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-500 mb-6">Ticket Information</p>
      </div>

      <div className="px-5 pb-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2">
            <OverviewRow label="Type" value={
              <span className="capitalize">{ticket.ticket_type.replace(/_/g, ' ')}</span>
            } />
            <div className="flex gap-4">
              <div className="w-px bg-gray-100 dark:bg-neutral-700 self-stretch" />
              <OverviewRow label="Priority" value={
                <span className={cn('flex items-center gap-1', priorityConf.chipCls.split(' ').filter(c => c.startsWith('text-')).join(' '))}>
                  <PIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="font-medium">{priorityConf.label}</span>
                </span>
              } />
            </div>
          </div>

          <OverviewRow label="Status" value={
            <span className={cn('inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border', STATUS_CONFIG[ticket.status]?.chipCls ?? '')}>
              {STATUS_CONFIG[ticket.status]?.label ?? ticket.status}
            </span>
          } />

          <OverviewRow label="Ticket ID" value={
            <code className="text-xs bg-gray-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
              #{ticket.short_id}
            </code>
          } />

          <OverviewRow label="SLA Deadline" value={
            slaDate ? (
              <span className={cn('text-sm font-medium', isPast ? 'text-red-600 dark:text-red-400' : '')}>
                {fmtDate(ticket.sla_deadline!)}
                {ticket.sla_breached && (
                  <span className="ml-1.5 text-xs font-semibold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">Breached</span>
                )}
              </span>
            ) : '—'
          } />
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">Submitter</p>
        <OverviewRow label="Email" value={
          ticket.submitter_email
            ? <span className="text-blue-600 dark:text-blue-400 text-sm break-all">{ticket.submitter_email}</span>
            : <span className="text-slate-400 dark:text-slate-500">—</span>
        } />
        <OverviewRow label="Role" value={<span className="capitalize">{ticket.submitter_role || '—'}</span>} />
        <OverviewRow label="Submitted" value={fmtDate(ticket.created_at)} />
        {ticket.resolved_at && (
          <OverviewRow label="Resolved" value={fmtDate(ticket.resolved_at)} />
        )}
        {ticket.is_duplicate && (
          <OverviewRow label="Duplicate of" value={
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              #{ticket.duplicate_of?.slice(0, 8).toUpperCase()}
            </span>
          } />
        )}
        {ticket.metadata.auto_priority_reason && (
          <OverviewRow label="Escalation reason" value={
            <span className="text-xs text-orange-600 dark:text-orange-400 leading-snug">
              {ticket.metadata.auto_priority_reason}
            </span>
          } />
        )}
      </div>
    </div>
  )
}

// ── TicketOverviewRight (replaces OverviewRightPanel) ─────────────────────────

function TicketOverviewRight({
  ticket,
  onTabChange,
  onStatusChange,
  patching,
  isSuperAdmin,
}: {
  ticket:         TicketDetail
  onTabChange:    (t: TicketTab) => void
  onStatusChange: (s: string) => void
  patching:       boolean
  isSuperAdmin:   boolean
}) {
  const threadMessages  = ticket.comments.filter(c => ['reply', 'llm_response'].includes(c.comment_type)).length
  const slaConf         = ticket.sla_breached ? { label: 'Breached', cls: 'text-red-600 dark:text-red-400 font-semibold text-sm' }
                        : ticket.sla_deadline  ? { label: 'On track', cls: 'text-green-600 dark:text-emerald-400 font-semibold text-sm' }
                        :                        { label: 'No SLA',   cls: 'text-slate-400 dark:text-slate-500 text-sm' }
  const entityCount     = (ticket.metadata.entity_refs ?? []).length

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ticket Status</h3>
        <p className="text-xs text-slate-700 dark:text-slate-400 mt-0.5">Current state and activity for this ticket.</p>
      </div>

      {/* 3 stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Thread',
            value: <span className="text-slate-800 dark:text-slate-200 font-semibold text-sm">{threadMessages} message{threadMessages !== 1 ? 's' : ''}</span>,
            sub: 'Replies & AI responses',
          },
          {
            label: 'SLA',
            value: <span className={slaConf.cls}>{slaConf.label}</span>,
            sub: ticket.sla_deadline ? fmtDate(ticket.sla_deadline, { month: 'short', day: 'numeric' }) : 'No deadline set',
          },
          {
            label: 'Age',
            value: <span className="text-slate-800 dark:text-slate-200 font-semibold text-sm">{daysAgo(ticket.created_at)}</span>,
            sub: `Opened ${fmtDate(ticket.created_at, { month: 'short', day: 'numeric' })}`,
          },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-4">
            <p className="text-xs text-slate-900 font-semibold dark:text-slate-400 mb-2">{s.label}</p>
            <div className="mb-1">{s.value}</div>
            <p className="text-xs text-slate-600 dark:text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions — super_admin only */}
      {isSuperAdmin && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-3">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {ticket.status === 'open' || ticket.status === 'auto_responded' ? (
              <button
                onClick={() => onStatusChange('in_review')}
                disabled={patching}
                className="h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                {patching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Set In Review
              </button>
            ) : null}
            {ticket.status === 'in_review' ? (
              <button
                onClick={() => onStatusChange('resolved')}
                disabled={patching}
                className="h-9 px-4 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                {patching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                Resolve
              </button>
            ) : null}
            {!['resolved', 'closed'].includes(ticket.status) && (
              <button
                onClick={() => onStatusChange('closed')}
                disabled={patching}
                className="h-9 px-4 text-sm font-medium bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" />Close
              </button>
            )}
            <button onClick={() => onTabChange('thread')} className="h-9 px-4 text-sm font-medium bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-lg flex items-center gap-2 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" />Reply
            </button>
            {entityCount > 0 && (
              <button onClick={() => onTabChange('refs')} className="h-9 px-4 text-sm font-medium bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-lg flex items-center gap-2 transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />{entityCount} Ref{entityCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Comment card components ────────────────────────────────────────────────────

function SystemEvent({ comment }: { comment: TicketComment }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-neutral-600 flex-shrink-0" />
      <p className="flex-1 text-xs text-slate-500 dark:text-slate-400">{comment.body}</p>
      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">
        {fmtDate(comment.created_at, { month: 'short', day: 'numeric' })}
      </span>
    </div>
  )
}

function LLMResponseCard({ comment }: { comment: TicketComment }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-blue-100 dark:border-blue-900 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">MBody AI</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-blue-400 dark:text-blue-500">
            {fmtDate(comment.created_at, { month: 'short', day: 'numeric' })} · {fmtTime(comment.created_at)}
          </span>
          <MoreHorizontal className="h-4 w-4 text-blue-400 dark:text-blue-500" />
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{comment.body}</p>
      </div>
      <div className="border-t border-blue-100 dark:border-blue-900 px-5 py-2.5 flex items-center gap-1 text-xs text-blue-400 dark:text-blue-500">
        <span>AI auto-response</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

function InternalNoteCard({ comment }: { comment: TicketComment }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-900 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
          <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{comment.author_email || 'Admin'}</span>
        <span className="ml-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">Internal note</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-amber-400 dark:text-amber-600">
            {fmtDate(comment.created_at, { month: 'short', day: 'numeric' })} · {fmtTime(comment.created_at)}
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed whitespace-pre-line">{comment.body}</p>
      </div>
      <div className="border-t border-amber-100 dark:border-amber-900 px-5 py-2.5 flex items-center gap-1 text-xs text-amber-400 dark:text-amber-600">
        <span>Visible to admins only</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

function ReplyCard({ comment, isAdmin }: { comment: TicketComment; isAdmin: boolean }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-neutral-800 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 flex-shrink-0 uppercase">
          {initials(comment.author_email)}
        </div>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{comment.author_email || 'User'}</span>
        {isAdmin && (
          <span className="ml-1 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900">Admin</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {fmtDate(comment.created_at, { month: 'short', day: 'numeric' })} · {fmtTime(comment.created_at)}
          </span>
          <MoreHorizontal className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{comment.body}</p>
      </div>
      <div className="border-t border-gray-100 dark:border-neutral-800 px-5 py-2.5 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
        <span>Reply</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

// ── ThreadTab ─────────────────────────────────────────────────────────────────

function ThreadTab({
  ticket,
  isSuperAdmin,
  onRefresh,
}: {
  ticket:       TicketDetail
  isSuperAdmin: boolean
  onRefresh:    () => void
}) {
  const [body,        setBody]        = useState('')
  const [commentType, setCommentType] = useState<'reply' | 'internal_note'>('reply')
  const [submitting,  setSubmitting]  = useState(false)

  const visibleComments = ticket.comments.filter(c =>
    isSuperAdmin ? true : c.comment_type !== 'internal_note'
  )

  const handleSubmit = useCallback(async () => {
    if (!body.trim() || submitting) return
    setSubmitting(true)
    try {
      await postComment(ticket.id, body.trim(), commentType)
      setBody('')
      onRefresh()
    } catch { /* silent */ }
    setSubmitting(false)
  }, [body, commentType, submitting, ticket.id, onRefresh])

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thread</h3>
        <p className="text-xs text-slate-700 dark:text-slate-400 mt-0.5">
          Full conversation — replies, AI responses, and admin notes.
        </p>
      </div>

      {/* Comment list */}
      <div className="space-y-4">
        {visibleComments.length === 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-16 text-center text-slate-400 dark:text-slate-500 text-sm">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
            No messages yet. The AI response appears here shortly after submission.
          </div>
        )}

        {visibleComments.map(comment => {
          if (comment.comment_type === 'system_event')  return <SystemEvent key={comment.id} comment={comment} />
          if (comment.comment_type === 'llm_response')  return <LLMResponseCard key={comment.id} comment={comment} />
          if (comment.comment_type === 'internal_note') return <InternalNoteCard key={comment.id} comment={comment} />
          const isAdminReply = comment.author_email !== ticket.submitter_email
          return <ReplyCard key={comment.id} comment={comment} isAdmin={isAdminReply} />
        })}
      </div>

      {/* Reply box */}
      <div className="mt-6 bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
        {/* Tab strip — internal_note only visible to super_admin */}
        <div className="flex border-b border-gray-100 dark:border-neutral-800">
          {(['reply', ...(isSuperAdmin ? ['internal_note'] : [])] as const).map(type => (
            <button
              key={type}
              onClick={() => setCommentType(type as 'reply' | 'internal_note')}
              className={cn(
                'px-5 py-3 text-sm font-normal relative transition-colors',
                commentType === type
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              {type === 'reply' ? 'Reply' : 'Internal Note'}
              {commentType === type && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 dark:bg-slate-100 rounded-t" />}
            </button>
          ))}
        </div>

        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={commentType === 'internal_note' ? 'Add an internal note (only visible to admins)…' : 'Write a reply…'}
          rows={4}
          className="w-full px-5 py-4 text-sm text-slate-800 dark:text-slate-200 bg-transparent placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none"
        />

        <div className="border-t border-gray-100 dark:border-neutral-800 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {commentType === 'internal_note' ? 'Visible to admins only' : 'Visible to submitter and admins'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RefsTab ───────────────────────────────────────────────────────────────────

function RefsTab({ ticket }: { ticket: TicketDetail }) {
  const refs   = ticket.metadata.entity_refs   ?? []
  const fields = ticket.metadata.missing_fields ?? []

  const REF_ICON: Record<string, ElementType> = {
    lead:    Building2,
    contact: User,
    user:    User,
  }
  const REF_COLOR: Record<string, string> = {
    lead:    'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    contact: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
    user:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  }

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Entity References</h3>
        <p className="text-xs text-slate-700 dark:text-slate-400 mt-0.5">
          Leads, contacts, and users linked to this ticket. Click to navigate directly.
        </p>
      </div>

      {refs.length === 0 && fields.length === 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-16 text-center text-slate-400 dark:text-slate-500 text-sm">
          <ExternalLink className="h-10 w-10 mx-auto mb-3 opacity-20" />
          No entity references detected yet. They populate automatically after AI processes the ticket.
        </div>
      )}

      {refs.length > 0 && (
        <div className="space-y-3 mb-8">
          {refs.map((ref, i) => {
            const Icon  = REF_ICON[ref.type]  ?? User
            const color = REF_COLOR[ref.type] ?? REF_COLOR.user
            return (
              <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-full', color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{ref.label}</span>
                    </div>
                    <a
                      href={ref.url}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="capitalize">{ref.type}</span>
                    <span className="text-slate-300 dark:text-neutral-600">·</span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">{String(ref.id).slice(0, 8)}</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-neutral-800 px-5 py-2.5 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <span>View {ref.type} record</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {fields.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-3">Missing Fields</p>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Field</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">Can provide</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-neutral-800 last:border-none hover:bg-gray-50/50 dark:hover:bg-neutral-800/50">
                      <td className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-300">{f.label}</td>
                      <td className="py-2.5 px-4">
                        <span className="text-xs bg-gray-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">Missing</span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={cn('text-xs font-semibold', f.editable ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500')}>
                          {f.editable ? 'Yes — reply with it' : 'No — pipeline only'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── HistoryTab ────────────────────────────────────────────────────────────────

function HistoryTab({ ticket }: { ticket: TicketDetail }) {
  const events = ticket.comments.filter(c => c.comment_type === 'system_event')

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">History</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Audit trail of all status changes and system events.</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-16 text-center text-slate-400 dark:text-slate-500 text-sm">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
          No system events recorded yet.
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <div className="relative px-5 py-4">
            {/* Vertical line */}
            <div className="absolute left-[29px] top-0 bottom-0 w-px bg-gray-100 dark:bg-neutral-800" />
            <div className="space-y-5">
              {events.map((evt, i) => (
                <div key={evt.id} className="flex items-start gap-4 relative">
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 bg-white dark:bg-neutral-900',
                    i === 0 ? 'border-blue-500' : 'border-gray-300 dark:border-neutral-600',
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{evt.body}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {fmtDate(evt.created_at, { month: 'short', day: 'numeric' })} · {fmtTime(evt.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

const TABS: { id: TicketTab; label: string }[] = [
  { id: 'overview', label: 'Overview'  },
  { id: 'thread',   label: 'Thread'    },
  { id: 'refs',     label: 'Refs'      },
  { id: 'history',  label: 'History'   },
]

export function TicketDetailPanel({
  ticket: initialTicket,
  onClose,
  isSuperAdmin,
  onTicketUpdated,
}: {
  ticket:           TicketDetail
  onClose:          () => void
  isSuperAdmin:     boolean
  onTicketUpdated?: (t: TicketDetail) => void
}) {
  const [tab,      setTab]     = useState<TicketTab>('overview')
  const [ticket,   setTicket]  = useState<TicketDetail>(initialTicket)
  const [patching, setPatching] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const fresh = await fetchTicket(initialTicket.id)
      setTicket(fresh)
      onTicketUpdated?.(fresh)
    } catch { /* ignore */ }
    setLoading(false)
  }, [initialTicket.id, onTicketUpdated])

  useEffect(() => { refresh() }, [refresh])

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (patching) return
    setPatching(true)
    try {
      const updated = await patchTicket(ticket.id, { status: newStatus })
      setTicket(updated)
      onTicketUpdated?.(updated)
    } catch { /* ignore */ }
    setPatching(false)
  }, [patching, ticket.id, onTicketUpdated])

  const typeConf   = TYPE_CONFIG[ticket.ticket_type]   ?? TYPE_CONFIG.general_enquiry
  const statusConf = STATUS_CONFIG[ticket.status]      ?? STATUS_CONFIG.open
  const slaBreached = ticket.sla_breached

  return (
    <div className="min-h-full bg-[#f9fafb] dark:bg-neutral-950">

      {/* ── White header card ── */}
      <div className="bg-white dark:bg-neutral-900">

        {/* Banner */}
        <div className="h-52 relative" style={{ backgroundImage: 'url(/herobg.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

        <div className="px-8">

          {/* Row 1: TicketTypeIcon (overlapping banner) + Status chip + Back button */}
          <div className="flex items-start justify-between mb-5">
            <TicketTypeIcon type={ticket.ticket_type} priority={ticket.priority} />

            <div className="flex items-center gap-3 pt-3">
              <div className={cn('flex items-center gap-2 text-sm px-3 py-1.5 rounded-full', statusConf.chipCls)}>
                {ticket.status === 'resolved'
                  ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                  : <AlertCircle  className="h-3.5 w-3.5 flex-shrink-0" />}
                {statusConf.label}
              </div>
              {loading && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-sm font-normal px-4 py-1.5 rounded-full bg-blue-200 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-blue-600 dark:text-blue-900 transition-colors"
              >
                Back to Tickets →
              </button>
            </div>
          </div>

          {/* Row 2: Subject + short ID subtitle */}
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 mt-6 leading-tight tracking-tight">
              {ticket.subject}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              #{ticket.short_id} · {ticket.submitter_email}{ticket.submitter_role ? ` · ${ticket.submitter_role}` : ''}
            </p>
          </div>

          {/* Row 3: Chips (left) + actions (right) */}
          <div className="flex items-center justify-between pb-5">
            <div className="flex items-center gap-2.5 flex-wrap">

              {/* Created date chip */}
              <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-600 dark:text-slate-400 border-2 border-blue-500 dark:border-neutral-700 rounded-full px-3 py-1.5">
                <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                {fmtDate(ticket.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>

              {/* Priority chip */}
              <div className={cn('text-xs font-semibold rounded-full px-3 py-1.5 capitalize', PRIORITY_CONFIG[ticket.priority]?.chipCls ?? '')}>
                {PRIORITY_CONFIG[ticket.priority]?.label ?? ticket.priority}
              </div>

              {/* Ticket type chip */}
              <div className="text-xs text-slate-800 dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-full px-3 py-1.5 capitalize">
                {typeConf.label}
              </div>

              {/* SLA breach chip */}
              {slaBreached && (
                <div className="text-xs font-semibold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-full px-3 py-1.5 flex items-center gap-1">
                  <TriangleAlert className="h-3.5 w-3.5 flex-shrink-0" />SLA Breached
                </div>
              )}

              {/* Duplicate chip */}
              {ticket.is_duplicate && (
                <div className="text-xs text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1.5">
                  Duplicate
                </div>
              )}
            </div>

            {/* Right side — submitter email link */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-xs text-slate-900 font-semibold dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-full px-3.5 py-2">
                {ticket.submitter_role || 'user'}
              </div>
              {ticket.submitter_email && (
                <a
                  href={`mailto:${ticket.submitter_email}`}
                  title={ticket.submitter_email}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-neutral-700 text-slate-800 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'px-5 py-3 text-sm font-normal relative transition-colors',
                  tab === id
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                {label}
                {tab === id && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 dark:bg-slate-100 rounded-t" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[346px_1fr] gap-6">

          {/* Left: Ticket info (persistent sticky) */}
          <div>
            <TicketInfoPanel ticket={ticket} />
          </div>

          {/* Right: Tab content */}
          <div>
            {/* SLA breach warning */}
            {slaBreached && (
              <div className="mb-5 flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-red-800 rounded-xl">
                <TriangleAlert className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="flex-1 text-xs text-slate-600 dark:text-red-300 leading-relaxed">
                  <strong>SLA breached.</strong> This ticket has exceeded its {PRIORITY_CONFIG[ticket.priority]?.label.toLowerCase()} priority deadline and requires immediate attention.
                </p>
              </div>
            )}

            {tab === 'overview' && (
              <TicketOverviewRight
                ticket={ticket}
                onTabChange={setTab}
                onStatusChange={handleStatusChange}
                patching={patching}
                isSuperAdmin={isSuperAdmin}
              />
            )}

            {tab === 'thread' && (
              <ThreadTab ticket={ticket} isSuperAdmin={isSuperAdmin} onRefresh={refresh} />
            )}

            {tab === 'refs' && (
              <RefsTab ticket={ticket} />
            )}

            {tab === 'history' && (
              <HistoryTab ticket={ticket} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
