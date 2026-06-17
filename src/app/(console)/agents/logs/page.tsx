'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'
import { LiveRunPanel } from '@/components/agents/LiveRunPanel'

import { AGENT_META } from '@/components/agents/AgentMeta'
import { resolveStatus } from '@/components/agents/AgentStatusUtils'
import { AgentLogsHeader } from '@/components/agents/AgentLogsHeader'
import { AgentCardGrid } from '@/components/agents/AgentCardGrid'
import { useAgentSelection } from '@/lib/agent-selection-context'

export default function AgentLogsPage() {
  const { activeAgent } = useAgentSelection()
  const [liveLog, setLiveLog] = useState<{ lead_id: string; lead_name: string } | null>(null)

  const meta = AGENT_META[activeAgent] ?? AGENT_META['research']

  const { data, isLoading } = useQuery({
    queryKey: ['agent-logs', activeAgent],
    queryFn: () => api.get(`/agents/${activeAgent}/logs`).then(r => r.data),
    staleTime: 3_000,
    refetchInterval: (query) => {
      const logs: any[] = (query.state.data as any)?.logs ?? []
      const hasLive = logs.some(l => resolveStatus(l.status, l.created) === 'running')
      return hasLive ? 3_000 : 20_000
    },
  })

  const logs: any[] = data?.logs ?? []

  return (
    <>
      <div className="flex h-full min-h-0">

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          <AgentLogsHeader meta={meta} logs={logs} />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AgentCardGrid
              logs={logs}
              defaultMeta={meta}
              isLoading={isLoading}
              agentLabel={meta.label}
              onOpenLive={l => setLiveLog({ lead_id: l.lead_id, lead_name: l.lead_name })}
            />
          </div>
        </div>


      </div>

      {liveLog && (
        <LiveRunPanel
          leadId={liveLog.lead_id}
          leadName={liveLog.lead_name}
          onClose={() => setLiveLog(null)}
        />
      )}
    </>
  )
}