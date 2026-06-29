'use client'

import { LayoutList, Network } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentMeta } from './AgentMeta'
import { resolveStatus } from './AgentStatusUtils'

export type AgentView = 'list' | 'network'

interface AgentLogsHeaderProps {
  meta: AgentMeta
  logs: any[]
  view: AgentView
  onViewChange: (v: AgentView) => void
}

export function AgentLogsHeader({ meta, logs, view, onViewChange }: AgentLogsHeaderProps) {
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

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-0.5 bg-slate-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button
            onClick={() => onViewChange('list')}
            title="Log cards"
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-md transition-colors',
              view === 'list'
                ? 'bg-white dark:bg-neutral-700 text-slate-700 dark:text-slate-200 shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            )}
          >
            <LayoutList size={14} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => onViewChange('network')}
            title="Pipeline network"
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-md transition-colors',
              view === 'network'
                ? 'bg-white dark:bg-neutral-700 text-slate-700 dark:text-slate-200 shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            )}
          >
            <Network size={14} strokeWidth={1.75} />
          </button>
        </div>
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