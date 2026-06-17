'use client'

import { cn, formatRelativeTime } from '@/lib/utils'
import type { AgentMeta } from './AgentMeta'
import { resolveStatus } from './AgentStatusUtils'
import { fmtDuration, fmtCost } from './AgentStatusUtils'
import { CircleAlert } from 'lucide-react'

// ── Vertical dot badge ────────────────────────────────────────────────────────

const VERTICAL_DOT: Record<string, string> = {
  casino:   'bg-cyan-400',
  airport:  'bg-sky-400',
  hospital: 'bg-emerald-400',
  transit:  'bg-orange-400',
  mall:     'bg-violet-400',
}

// ── Model short name ──────────────────────────────────────────────────────────

function modelName(m: string | null): string | null {
  if (!m) return null
  if (m.includes('opus'))   return 'Opus'
  if (m.includes('sonnet')) return 'Sonnet'
  if (m.includes('haiku'))  return 'Haiku'
  return null
}

// ── Status dot color ──────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  success:     'bg-emerald-400',
  failed:      'bg-red-400',
  running:     'bg-blue-400 animate-pulse',
  pending:     'bg-amber-400',
  interrupted: 'bg-slate-300',
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface AgentCardProps {
  log: any
  meta: AgentMeta
  onOpenLive?: (log: any) => void
}

export function AgentCard({ log, meta, onOpenLive }: AgentCardProps) {
  const Icon      = meta.icon
  const resolved  = resolveStatus(log.status, log.created)
  const isRunning = resolved === 'running'
  const isCritic  = log.score !== undefined

  const dotCls  = STATUS_DOT[resolved] ?? 'bg-slate-300'
  const vertDot = log.vertical ? VERTICAL_DOT[log.vertical] : null
  const duration = fmtDuration(log.latency_ms)
  const cost     = fmtCost(log.cost_usd)
  const model    = modelName(log.claude_model)
  const tokens   = log.input_tokens != null
    ? `${Math.round(((log.input_tokens ?? 0) + (log.output_tokens ?? 0)) / 1000 * 10) / 10}k tok`
    : null

  const subAgents = log.sub_agent_count > 0 ? `${log.sub_agent_count} sub-agents` : null

  // Build the detail sentence
  const details = [model, subAgents].filter(Boolean).join(' · ')

  // Critic extras
  const criticDetail = isCritic
    ? [
        log.score !== undefined ? `Score ${log.score}` : null,
        log.confidence != null  ? `${Math.round(log.confidence * 100)}% conf` : null,
        log.total_tool_turns > 0 ? `${log.total_tool_turns} turns` : null,
        log.source ? `via ${log.source}` : null,
      ].filter(Boolean).join(' · ')
    : null

  return (
    <div
      className={cn(
        'flex items-start gap-4 px-5 py-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-2xl shadow-sm dark:shadow-none transition-shadow',
        isRunning ? 'cursor-pointer shadow-md ring-1 ring-blue-200 dark:ring-blue-800' : 'hover:shadow-md dark:hover:shadow-none'
      )}
      onClick={() => isRunning && onOpenLive?.(log)}
    >
      {/* ── Left: agent icon circle + vertical dot ── */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="w-11 h-11 flex items-center justify-center">
          <Icon size={17} className={meta.color} strokeWidth={1.75} />
        </div>
      </div>

      {/* ── Center: label + time + sentence ── */}
      <div className="flex-1 min-w-0">
        {/* Top: agent name · timestamp · force-approved */}
        <div className="flex items-center gap-2 flex-wrap mb-0">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{meta.label}</span>
            {' · '}
            {log.created ? formatRelativeTime(log.created) : '—'}
            {isRunning && <span className="ml-1 text-blue-500 dark:text-blue-400 font-medium">· live</span>}
          </p>
          {log.was_overridden && (
            <span className="text-xs font-semibold px-2 py-0.5 mb-1.5 rounded-full bg-amber-600 text-white">
              Force-approved
            </span>
          )}
          {isCritic && (
            <span className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              log.approved ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            )}>
              {log.approved ? 'Approved' : 'Rejected'}
            </span>
          )}
        </div>

        {/* Main sentence */}
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
          agent ran on{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{log.lead_name ?? '—'}</span>
          {resolved !== 'running' && (
            <> <span className={cn(
              'font-semibold text-xs',
              resolved === 'success'     ? 'text-cyan-500' :
              resolved === 'failed'      ? 'text-red-500 dark:text-red-400'     :
              resolved === 'interrupted' ? 'text-slate-400 dark:text-slate-500'   : 'text-slate-600 dark:text-slate-400'
            )}>
              {resolved === 'success'     ? 'Completed' :
               resolved === 'failed'      ? 'Failed'    :
               resolved === 'interrupted' ? 'Interrupted' : resolved}
            </span></>
          )}
          {details && <span className="text-slate-600 dark:text-slate-400 text-xs">  model {details}</span>}
        </p>

        {/* Cost — own line, semibold */}
        {cost && (
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{cost}</p>
        )}

        {/* Critic score / detail */}
        {criticDetail && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{criticDetail}</p>
        )}

        {/* Critic rationale */}
        {isCritic && log.rationale && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5  line-clamp-1">
            "{log.rationale.slice(0, 100)}"
          </p>
        )}

        {/* Error */}
        {log.error_message && (
          <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-2 font-medium mt-0.5 line-clamp-1">
            <CircleAlert className='flex-shrink-0 w-3.5 h-3.5' />
            {log.error_message.split('\n')[0].slice(0, 100)}
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
