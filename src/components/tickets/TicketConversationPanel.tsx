'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Send, Lock, Loader2, TriangleAlert, CircleSlash2, CircleDashed, Plus, Ticket } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import axios from 'axios'
import Cookies from 'js-cookie'
import type { TicketListItem } from './TicketCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TicketTask {
  id:         number
  title:      string
  completed:  boolean
  order:      number
  created_at: string
}

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

async function fetchTasks(id: string): Promise<TicketTask[]> {
  const { data } = await axios.get(`/api/tickets/${id}/tasks/`, { headers: authHeaders() })
  return data
}

async function toggleTask(ticketId: string, taskId: number): Promise<TicketTask> {
  const { data } = await axios.patch(`/api/tickets/${ticketId}/tasks/${taskId}/`, {}, { headers: authHeaders() })
  return data
}

async function createTask(ticketId: string, title: string): Promise<TicketTask> {
  const { data } = await axios.post(`/api/tickets/${ticketId}/tasks/`, { title }, { headers: authHeaders() })
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
      <div className="flex-shrink-0 flex items-center justify-center text-cyan-500 mt-0.5">
        <Ticket size={14} />
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-400 leading-relaxed">{comment.body}</p>
      <span className="ml-auto text-xs text-slate-400 dark:text-slate-600 flex-shrink-0 mt-0.5">
        {formatRelativeTime(comment.created_at)}
      </span>
    </div>
  )
}

function LLMResponse({ comment }: { comment: TicketComment }) {
  return (
    <div className="bg-slate-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-neutral-700">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Auto-Response</span>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(comment.created_at)}</span>
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
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Internal Note</span>
        <span className="ml-auto text-xs text-amber-400 dark:text-amber-600">{formatRelativeTime(comment.created_at)}</span>
      </div>
      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{comment.body}</p>
    </div>
  )
}

// ── Status / priority labels ──────────────────────────────────────────────────

const STATUS_CHIP: Record<string, string> = {
  open:           'bg-amber-500 text-white dark:bg-amber-950/40 dark:text-amber-400',
  auto_responded: 'bg-violet-500 text-white dark:bg-violet-950/40 dark:text-violet-400',
  in_review:      'bg-blue-500 text-white dark:bg-blue-950/40 dark:text-blue-400',
  resolved:       'bg-emerald-500 text-white dark:bg-emerald-950/40 dark:text-emerald-400',
  closed:         'bg-slate-500 text-white dark:bg-slate-800 dark:text-slate-400',
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
  const [reply, setReply]         = useState('')
  const [noteMode, setNoteMode]   = useState(false)
  const [newTask, setNewTask]     = useState('')
  const [addingTask, setAddingTask] = useState(false)

  const { data: detail, isLoading } = useQuery<TicketDetail>({
    queryKey: ['ticket-detail', ticket.id],
    queryFn:  () => fetchDetail(ticket.id),
    staleTime: 0,
  })

  const { data: tasks = [] } = useQuery<TicketTask[]>({
    queryKey: ['ticket-tasks', ticket.id],
    queryFn:  () => fetchTasks(ticket.id),
    staleTime: 10_000,
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

  const toggleMutation = useMutation({
    mutationFn: (taskId: number) => toggleTask(ticket.id, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-tasks', ticket.id] })
      qc.invalidateQueries({ queryKey: ['ticket-list'] })
    },
  })

  const addTaskMutation = useMutation({
    mutationFn: (title: string) => createTask(ticket.id, title),
    onSuccess: () => {
      setNewTask('')
      setAddingTask(false)
      qc.invalidateQueries({ queryKey: ['ticket-tasks', ticket.id] })
      qc.invalidateQueries({ queryKey: ['ticket-list'] })
    },
  })

  const name   = nameFromEmail(ticket.submitter_email)
  const status = STATUS_LABEL[ticket.status] ?? ticket.status

  return (
    <div className="fixed top-4 right-4 bottom-4 z-50 flex flex-col w-[380px] bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 shadow-2xl rounded-2xl overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500">
          <Ticket size={14} />
        </div>
        <p className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          {ticket.subject}
        </p>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Profile section ── */}
      <div className="flex-shrink-0 px-5 py-5 border-none border-slate-100 dark:border-neutral-800">
        <div className="flex items-start gap-4">
          <Avatar
            email={ticket.submitter_email}
            name={name}
            size="xl"
            square={false}
          />
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              {ticket.submitter_role && (
                <span className="truncate">{ticket.submitter_role}</span>
              )}
              {ticket.submitter_role && ticket.submitter_email && (
                <span className="text-slate-300 dark:text-slate-600">•</span>
              )}
              {ticket.submitter_email && (
                <span className="truncate text-slate-500 dark:text-slate-500">{ticket.submitter_email}</span>
              )}
            </div>
          </div>
        </div>

        {/* Ticket meta chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', STATUS_CHIP[ticket.status])}>
            {status}
          </span>
          {ticket.priority === 'urgent' && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">Urgent</span>
          )}
          {ticket.priority === 'high' && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-500 text-white">High</span>
          )}
          {ticket.sla_breached && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <TriangleAlert size={9} />SLA
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
            {formatRelativeTime(ticket.created_at)}
          </span>
        </div>

        {/* Subject */}
        <p className="text-xs font-normal text-slate-800 dark:text-slate-300 mt-2.5 leading-snug">
          {ticket.subject}
        </p>
      </div>

      {/* ── Task checklist ── */}
      {(tasks.length > 0 || isSuperAdmin) && (
        <div className="flex-shrink-0 border-none border-slate-100 dark:border-neutral-800 px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-500 mb-3">
              {tasks.length > 0 && `${tasks.filter(t => t.completed).length} of ${tasks.length} Recommended Tasks Completed`}
            </span>
            {isSuperAdmin && !addingTask && (
              <button
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <Plus size={11} /> Add
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {tasks.map(task => (
              <div key={task.id} className="flex items-start gap-2 group/task">
                <button
                  onClick={() => isSuperAdmin && toggleMutation.mutate(task.id)}
                  disabled={!isSuperAdmin || toggleMutation.isPending}
                  className="flex-shrink-0 mt-0.5"
                >
                  {task.completed
                    ? <CircleSlash2 size={16} className="text-cyan-600 dark:text-cyan-400" />
                    : <CircleDashed size={16} className="text-slate-500 dark:text-slate-600 group-hover/task:text-slate-400" />
                  }
                </button>
                <span className={cn(
                  'text-xs leading-relaxed',
                  task.completed
                    ? 'line-through text-slate-400 dark:text-slate-600'
                    : 'text-slate-700 dark:text-slate-300',
                )}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>

          {addingTask && (
            <div className="flex items-center gap-2 mt-2">
              <input
                autoFocus
                type="text"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTask.trim()) addTaskMutation.mutate(newTask.trim())
                  if (e.key === 'Escape') { setAddingTask(false); setNewTask('') }
                }}
                placeholder="Task title… (Enter to save)"
                className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => newTask.trim() && addTaskMutation.mutate(newTask.trim())}
                disabled={!newTask.trim() || addTaskMutation.isPending}
                className="px-2 py-1 text-[10px] rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors"
              >
                {addTaskMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}

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
                  'text-xs px-2.5 py-0.5 rounded-full transition-colors',
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
                  'text-xs px-2.5 py-0.5 rounded-full transition-colors',
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
