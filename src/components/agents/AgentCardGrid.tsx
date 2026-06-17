'use client'

import { Loader2 } from 'lucide-react'
import { AgentCard } from './Agentcard'
import { AGENT_META } from './AgentMeta'
import type { AgentMeta } from './AgentMeta'

interface AgentCardGridProps {
  logs: any[]
  defaultMeta: AgentMeta
  isLoading: boolean
  agentLabel: string
  onOpenLive: (log: any) => void
}

export function AgentCardGrid({ logs, defaultMeta, isLoading, agentLabel, onOpenLive }: AgentCardGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400 dark:text-slate-500 gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
        <p className="text-sm">No runs recorded for {agentLabel} yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map(log => {
        const cardMeta = (log.agent_type && AGENT_META[log.agent_type]) ?? defaultMeta
        return (
          <AgentCard
            key={log.id}
            log={log}
            meta={cardMeta}
            onOpenLive={onOpenLive}
          />
        )
      })}
    </div>
  )
}
