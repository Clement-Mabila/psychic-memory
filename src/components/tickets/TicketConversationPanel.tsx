'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Send, Lock, Loader2, TriangleAlert } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import axios from 'axios'
import Cookies from 'js-cookie'
import type { TicketListItem } from './TicketCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TicketComment {
  id:           string
  comment_type: 'reply' | 'internal_note' | 'system_event' | 'llm_response'
  body:         string
  author_email: string
  created_at:   string
}

interface TicketDetail extends TicketListItem {
  body:     string
  comments: TicketComment[]
}

// ── API ───────────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = Cookies.get('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchDetail(id: string): Promise<TicketDetail> {
  const { data } = await axios.get(`/api/tickets/${id}/`, { headers: authHeaders() })
  return data
}

async function postComment(id: string, body: string, type: string) {
  const { data } = await axios.post(
    `/api/tickets/${id}/comments/`,
    { comment_type: type, body },
    { headers: authHeaders() },
  )
  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nameFromEmail(email: string): string {
  if (!email) return 'Unknown'
  const local = email.split('@')[0]
  return local.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

// ── Comment components ────────────────────────────────────────────────────────

function SystemEvent({ comment }: { comment: TicketComment }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mt-2 flex-shrink-0" />
      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{comment.body}</p>
      <span className="ml-auto text-[10px] text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5">
        {formatRelativeTime(comment.created_at)}
      </span>
    </div>
  )
}

function LLMResponse({ comment }: { comment: TicketComment }) {
  return (
    <div className="bg-slate-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-neutral-700">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">AI Auto-Response</span>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">{formatRelativeTime(comment.created_at)}</span>
      </div>
      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
    </div>
  )
}

function ReplyBubble({ comment, isAdmin }: { comment: TicketComment; isAdmin: boolean }) {
  const name = comment.author_email ? nameFromEmail(comment.author_email) : 'Submitter'
  return (
    <div className={cn('flex items-end gap-2', isAdmin ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar email={comment.author_email || 'user'} name={name} size="xs" className="flex-shrink-0 mb-0.5" />
      <div className={cn(
        'max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed',
        isAdmin
          ? 'bg-cyan-500 text-white rounded-br-sm'
          : 'bg-white dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700 text-slate-700 dark:text-slate-300 rounded-bl-sm',
      )}>
        <p className="whitespace-pre-wrap">{comment.body}</p>
        <p className={cn('text-[10px] mt-0.5', isAdmin ? 'text-cyan-100' : 'text-slate-400 dark:text-slate-500')}>
          {formatRelativeTime(comment.created_at)}
        </p>
      </div>
    </div>
  )
}

function InternalNote({ comment }: { comment: TicketComment }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Lock size={10} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Internal Note</span>
        <span className="ml-auto text-[10px] text-amber-400 dark:text-amber-600">{formatRelativeTime(comment.created_at)}</span>
      </div>
      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{comment.body}</p>
    </div>
  )
}

// ── Status / priority labels ──────────────────────────────────────────────────

const STATUS_CHIP: Record<string, string> = {
  open:           'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  auto_responded: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  in_review:      'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  resolved:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  closed:         'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

const STATUS_LABEL: Record<string, string> = {
  open:           'Open',
  auto_responded: 'AI Responded',
  in_review:      'In Review',
  resolved:       'Resolved',
  closed:         'Closed',
}

// ── TicketConversationPanel ───────────────────────────────────────────────────

interface Props {
  ticket:       TicketListItem
  isSuperAdmin: boolean
  onClose:      () => void
}

export function TicketConversationPanel({ ticket, isSuperAdmin, onClose }: Props) {
  const qc           = useQueryClient()
  const threadRef    = useRef<HTMLDivElement>(null)
  const [reply, setReply] = useState('')
  const [noteMode, setNoteMode] = useState(false)

  const { data: detail, isLoading } = useQuery<TicketDetail>({
    queryKey: ['ticket-detail', ticket.id],
    queryFn:  () => fetchDetail(ticket.id),
    staleTime: 0,
  })

  // Scroll thread to bottom when comments load
  useEffect(() => {
    if (detail && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [detail?.comments?.length])

  const sendMutation = useMutation({
    mutationFn: () => postComment(ticket.id, reply.trim(), noteMode ? 'internal_note' : 'reply'),
    onSuccess: () => {
      setReply('')
      qc.invalidateQueries({ queryKey: ['ticket-detail', ticket.id] })
      qc.invalidateQueries({ queryKey: ['ticket-list'] })
    },
  })

  const name   = nameFromEmail(ticket.submitter_email)
  const status = STATUS_LABEL[ticket.status] ?? ticket.status

  return (
    <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[360px] bg-white dark:bg-neutral-900 border-l border-slate-100 dark:border-neutral-800 shadow-2xl">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          #{ticket.short_id}
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Profile section ── */}
      <div className="flex-shrink-0 px-5 py-5 border-b border-slate-100 dark:border-neutral-800">
        <div className="flex items-start gap-4">
          <Avatar
            email={ticket.submitter_email}
            name={name}
            size="xl"
            square={false}
          />
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">{name}</h2>
            {ticket.submitter_role && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ticket.submitter_role}</p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{ticket.submitter_email}</p>
          </div>
        </div>

        {/* Ticket meta chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_CHIP[ticket.status])}>
            {status}
          </span>
          {ticket.priority === 'urgent' && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">Urgent</span>
          )}
          {ticket.priority === 'high' && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500 text-white">High</span>
          )}
          {ticket.sla_breached && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <TriangleAlert size={9} />SLA
            </span>
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
            {formatRelativeTime(ticket.created_at)}
          </span>
        </div>

        {/* Subject */}
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2.5 leading-snug">
          {ticket.subject}
        </p>
      </div>

      {/* ── Thread ── */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
      >
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400 dark:text-slate-500 text-xs">
            <Loader2 size={14} className="animate-spin" /> Loading thread…
          </div>
        )}

        {detail?.comments?.map(comment => {
          if (comment.comment_type === 'system_event')
            return <SystemEvent key={comment.id} comment={comment} />
          if (comment.comment_type === 'llm_response')
            return <LLMResponse key={comment.id} comment={comment} />
          if (comment.comment_type === 'internal_note')
            return <InternalNote key={comment.id} comment={comment} />
          // reply — admin replies are right-aligned
          const isAdmin = !!comment.author_email
          return <ReplyBubble key={comment.id} comment={comment} isAdmin={isAdmin} />
        })}
      </div>

      {/* ── Reply input ── */}
      {(isSuperAdmin || ticket.status !== 'closed') && (
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-neutral-800 px-4 py-3">

          {/* Note mode toggle — super admin only */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setNoteMode(false)}
                className={cn(
                  'text-[11px] px-2.5 py-0.5 rounded-full transition-colors',
                  !noteMode
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600',
                )}
              >
                Reply
              </button>
              <button
                onClick={() => setNoteMode(true)}
                className={cn(
                  'text-[11px] px-2.5 py-0.5 rounded-full transition-colors',
                  noteMode
                    ? 'bg-amber-500 text-white font-semibold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600',
                )}
              >
                Internal Note
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && reply.trim()) {
                  e.preventDefault()
                  sendMutation.mutate()
                }
              }}
              placeholder={noteMode ? 'Internal note (only visible to admins)…' : 'Write a reply…'}
              className={cn(
                'flex-1 resize-none rounded-xl px-3 py-2 text-xs leading-relaxed outline-none border transition-colors',
                noteMode
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 placeholder:text-amber-400 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-300 focus:border-slate-300 dark:focus:border-neutral-600',
              )}
            />
            <button
              onClick={() => reply.trim() && sendMutation.mutate()}
              disabled={!reply.trim() || sendMutation.isPending}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-200 dark:disabled:bg-neutral-700 disabled:text-slate-400 dark:disabled:text-slate-500 transition-colors flex-shrink-0"
            >
              {sendMutation.isPending
                ? <Loader2 size={13} className="animate-spin" />
                : <Send size={13} />
              }
            </button>
          </div>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1.5 text-right">⌘↵ to send</p>
        </div>
      )}
    </div>
  )
}
