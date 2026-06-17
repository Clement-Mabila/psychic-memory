'use client'

import { cn } from '@/lib/utils'
import type { AgentMeta } from './AgentMeta'
import { resolveStatus } from './AgentStatusUtils'

interface AgentLogsHeaderProps {
  meta: AgentMeta
  logs: any[]
}

export function AgentLogsHeader({ meta, logs }: AgentLogsHeaderProps) {
  const Icon = meta.icon

  const hasLive      = logs.some(l => resolveStatus(l.status, l.created) === 'running')
  const totalCost    = logs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
  const successCount = logs.filter(l => l.status === 'success').length
  const failCount    = logs.filter(l => l.status === 'failed').length
  const interrupted  = logs.filter(l => resolveStatus(l.status, l.created) === 'interrupted').length

  return (
    <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
      {/* Title row */}
      <div className="flex items-center gap-3 mb-1">
        <Icon
          size={16}
          className={cn(meta.color, hasLive && 'animate-pulse')}
          strokeWidth={1.75}
        />
        <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{meta.label} Audit Logs</h1>
        {hasLive && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Stats row */}
      {logs.length > 0 && (
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">{logs.length} runs shown</span>
          <span className="text-slate-200">·</span>
          <span className="text-xs text-slate-600 dark:text-slate-400">{successCount} completed</span>
          {failCount > 0 && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-xs text-red-500 dark:text-red-400 font-medium">{failCount} failed</span>
            </>
          )}
          {interrupted > 0 && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{interrupted} interrupted</span>
            </>
          )}
          {totalCost > 0 && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">${totalCost.toFixed(4)} total cost</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}