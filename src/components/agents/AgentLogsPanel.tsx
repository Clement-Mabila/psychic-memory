'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, ChevronDown, ChevronRight, Terminal, FileText, AlertCircle, CheckCircle2, Loader2, Clock } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtCost(usd: number | null): string {
  if (usd == null || usd === 0) return '—'
  return `$${usd.toFixed(4)}`
}

function fmtTokens(n: number | null): string {
  if (n == null || n === 0) return '—'
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

// ── Status display ────────────────────────────────────────────────────────────

const STALE_MS = 2 * 60 * 60 * 1000

function resolveStatus(status: string, created: string | null): string {
  if (status !== 'running' || !created) return status
  return Date.now() - new Date(created).getTime() > STALE_MS ? 'interrupted' : 'running'
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  success:     { label: 'Completed',   icon: CheckCircle2, classes: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' },
  failed:      { label: 'Failed',      icon: AlertCircle,  classes: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'         },
  running:     { label: 'Running',     icon: Loader2,      classes: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'       },
  pending:     { label: 'Queued',      icon: Clock,        classes: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'     },
  interrupted: { label: 'Interrupted', icon: AlertCircle,  classes: 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800'      },
}

function StatusBadge({ status, created }: { status: string; created?: string | null }) {
  const resolved = resolveStatus(status, created ?? null)
  const cfg = STATUS_CONFIG[resolved] ?? { label: resolved, icon: Clock, classes: 'text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-950' }
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.classes)}>
      <Icon size={11} className={resolved === 'running' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  )
}

// ── Log row ───────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: any }) {
  const [open,  setOpen]  = useState(false)
  const [tab,   setTab]   = useState<'summary' | 'terminal'>('summary')

  const errorSummary = log.error_message
    ? log.error_message.split('\n')[0].slice(0, 120)
    : null

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      {/* Main row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
      >
        {open
          ? <ChevronDown size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
          : <ChevronRight size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />}

        <StatusBadge status={log.status} created={log.created} />

        <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 font-medium truncate min-w-0">
          {log.lead_name}
        </span>

        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{fmtDuration(log.latency_ms)}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 w-14 text-right">{fmtCost(log.cost_usd)}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 w-12 text-right">{log.created ? formatRelativeTime(log.created) : '—'}</span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4">
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            <button
              onClick={() => setTab('summary')}
              className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors', tab === 'summary' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300')}
            >
              <FileText size={11} /> Summary
            </button>
            <button
              onClick={() => setTab('terminal')}
              className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors', tab === 'terminal' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300')}
            >
              <Terminal size={11} /> Terminal
            </button>
          </div>

          {tab === 'summary' && (
            <div className="space-y-2">
              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Duration',      value: fmtDuration(log.latency_ms) },
                  { label: 'Cost',          value: fmtCost(log.cost_usd) },
                  { label: 'Attempt',       value: log.attempt_number ?? 1 },
                ].map(m => (
                  <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">{m.label}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Tokens in',  value: fmtTokens(log.input_tokens) },
                  { label: 'Tokens out', value: fmtTokens(log.output_tokens) },
                ].map(m => (
                  <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">{m.label}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Error */}
              {errorSummary && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400">{errorSummary}</p>
                </div>
              )}

              {/* Status message */}
              {!errorSummary && log.status === 'success' && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-3 py-2">
                  <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">Agent completed successfully — lead advanced to next stage.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'terminal' && (
            <div className="bg-slate-900 dark:bg-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="text-[11px] text-slate-300 dark:text-slate-600 font-mono whitespace-pre-wrap break-all leading-relaxed">
                {log.error_message
                  ? `ERROR:\n${log.error_message}`
                  : `status: ${log.status}\nagent_type: ${log.agent_type ?? '—'}\nlatency_ms: ${log.latency_ms ?? '—'}\ncost_usd: ${log.cost_usd ?? '—'}\ninput_tokens: ${log.input_tokens ?? '—'}\noutput_tokens: ${log.output_tokens ?? '—'}\nattempt: ${log.attempt_number ?? 1}\nlead_id: ${log.lead_id}`
                }
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface AgentLogsPanelProps {
  agentType: string | null
  agentName: string
  onClose: () => void
}

export function AgentLogsPanel({ agentType, agentName, onClose }: AgentLogsPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-logs', agentType],
    queryFn: () => api.get(`/agents/${agentType}/logs`).then(r => r.data),
    enabled: !!agentType,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const logs: any[] = data?.logs ?? []

  const totalCost   = logs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
  const totalTokens = logs.reduce((s, l) => s + (l.input_tokens ?? 0) + (l.output_tokens ?? 0), 0)
  const successRate = logs.length
    ? Math.round(logs.filter(l => l.status === 'success').length / logs.length * 100)
    : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-screen w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-black/40 z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{agentName} — Run Logs</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Last {logs.length} executions</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Summary stats */}
        {logs.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
            {successRate !== null && (
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Success rate</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{successRate}%</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Total cost</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fmtCost(totalCost)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Total tokens</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fmtTokens(totalTokens)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Runs shown</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{logs.length}</p>
            </div>
          </div>
        )}

        {/* Log list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400 dark:text-slate-500">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading…
            </div>
          )}
          {!isLoading && logs.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400 dark:text-slate-500">
              No runs recorded yet for this agent.
            </div>
          )}
          {logs.map(log => <LogRow key={log.id} log={log} />)}
        </div>

      </div>
    </>
  )
}
