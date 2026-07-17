'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'
import { LiveRunPanel } from '@/components/agents/LiveRunPanel'

import { AGENT_META } from '@/components/agents/AgentMeta'
import { resolveStatus } from '@/components/agents/AgentStatusUtils'
import { AgentLogsHeader, type AgentView } from '@/components/agents/AgentLogsHeader'
import { AgentCardGrid } from '@/components/agents/AgentCardGrid'
import { AgentNetworkViz } from '@/components/agents/AgentNetworkViz'
import { useAgentSelection } from '@/lib/agent-selection-context'
import { TechnicalKanban } from '@/components/leads/TechnicalKanban'

export default function AgentLogsPage() {
  const { activeAgent } = useAgentSelection()
  const [liveLog, setLiveLog] = useState<{ lead_id: string; lead_name: string } | null>(null)
  const [view, setView] = useState<AgentView>('list')

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

  const { data: allAgentsData } = useQuery({
    queryKey: ['sidebar-agents'],
    queryFn: () => api.get('/agents').then(r => r.data),
    refetchInterval: 5_000,
    staleTime: 4_000,
    enabled: view === 'network',
  })

  const logs: any[]      = data?.logs ?? []
  const allAgents: any[] = allAgentsData?.agents ?? []

  return (
    <>
      <div className="flex h-full min-h-0">

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          <AgentLogsHeader
            meta={meta}
            logs={logs}
            view={view}
            onViewChange={setView}
          />

          {view === 'list' && (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AgentCardGrid
                logs={logs}
                defaultMeta={meta}
                isLoading={isLoading}
                agentLabel={meta.label}
                onOpenLive={l => setLiveLog({ lead_id: l.lead_id, lead_name: l.lead_name })}
              />
            </div>
          )}
          {view === 'kanban' && (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <TechnicalKanban />
            </div>
          )}
          {view === 'network' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <AgentNetworkViz agents={allAgents} />
            </div>
          )}
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