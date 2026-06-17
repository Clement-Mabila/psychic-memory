'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn, formatRelativeTime } from '@/lib/utils'
import { MoreHorizontal, Star, Search, AudioLines, CirclePlay, Circle, Octagon, Pentagon, Squircle, Aperture, Atom } from 'lucide-react'
import api from '@/lib/api'
import { useAgentFocus } from '@/lib/agent-focus-context'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AgentLogsPanel } from '@/components/agents/AgentLogsPanel'
import { LiveRunPanel } from '@/components/agents/LiveRunPanel'
import { ThemeToggle } from '@/components/theme/theme-toggle'

interface PageHeaderProps {
  className?: string
}

const AGENT_META: Record<string, { icon: React.ElementType; color: string }> = {
  discovery:            { icon: Pentagon,  color: 'text-indigo-500'  },
  research:             { icon: Aperture,  color: 'text-purple-500'  },
  company_intel:        { icon: Octagon,   color: 'text-sky-500'     },
  contact:              { icon: Aperture,  color: 'text-pink-500'    },
  enrichment:           { icon: Circle,    color: 'text-orange-500'  },
  qualification:        { icon: Squircle,  color: 'text-emerald-500' },
  handoff:              { icon: Pentagon,  color: 'text-teal-500'    },
  research_critic:      { icon: Squircle,  color: 'text-violet-500'  },
  contact_critic:       { icon: Atom,      color: 'text-rose-500'    },
  enrichment_critic:    { icon: Squircle,  color: 'text-amber-500'   },
  qualification_critic: { icon: Atom,      color: 'text-cyan-500'    },
  outreach_critic:      { icon: Atom,      color: 'text-lime-500'    },
  supervisor_critic:    { icon: Atom,      color: 'text-fuchsia-500' },
  system_llm:           { icon: Atom,      color: 'text-pink-400'    },
}

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  success: { dot: 'bg-emerald-400',              label: 'Completed'  },
  failed:  { dot: 'bg-red-400',                  label: 'Failed'     },
  running: { dot: 'bg-blue-400 animate-pulse',   label: 'Running'    },
  pending: { dot: 'bg-amber-400',                label: 'Pending'    },
}

export function PageHeader({ className }: PageHeaderProps) {
  const { focusedAgent } = useAgentFocus()
  const router           = useRouter()
  const [logsOpen, setLogsOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['sidebar-agents'],
    queryFn:  () => api.get('/agents').then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  // Poll for live active executions every 5s
  const { data: activeData } = useQuery({
    queryKey: ['agents-active'],
    queryFn:  () => api.get('/agents/active').then(r => r.data),
    refetchInterval: 5_000,
    staleTime: 4_000,
  })
  const liveExecutions: any[] = activeData?.active ?? []
  const isAnyRunning = liveExecutions.length > 0
  const liveExecution = liveExecutions[0] ?? null

  const agents: any[] = data?.agents ?? []

  const lastRun = agents
    .filter(a => a.last_run_at)
    .sort((a, b) => new Date(b.last_run_at).getTime() - new Date(a.last_run_at).getTime())[0]

  // Priority: live running > sidebar-clicked > last run
  const liveAgentMeta = liveExecution
    ? { agent_type: liveExecution.agent_type, display_name: liveExecution.agent_type.replace(/_/g, ' '), recent_leads: [] }
    : null
  const activeAgent = liveAgentMeta ?? focusedAgent ?? lastRun

  const meta        = AGENT_META[activeAgent?.agent_type] ?? { icon: Circle, color: 'text-gray-400' }
  const AgentIcon   = meta.icon
  const agentName   = liveExecution
    ? (agents.find(a => a.agent_type === liveExecution.agent_type)?.display_name ?? liveExecution.agent_type.replace(/_/g, ' '))
    : (activeAgent?.display_name ?? '—')
  const recentLeads: { company_name: string }[] = liveExecution
    ? [{ company_name: liveExecution.lead_name }]
    : (activeAgent?.recent_leads?.slice(0, 3) ?? [])

  const status      = liveExecution ? 'running' : activeAgent?.last_status
  const statusStyle = STATUS_STYLE[status] ?? null
  const lastRunAt   = activeAgent?.last_run_at
  const runs24h     = activeAgent?.runs_24h ?? 0

  const runMutation = useMutation({
    mutationFn: () => api.post(`/leads/bulk/`, {
      lead_ids: activeAgent?.recent_leads?.map((l: any) => l.lead_id).filter(Boolean) ?? [],
      action: 'run',
    }),
  })

  return (
    <>
    <header className={cn('bg-white border-b border-gray-100 px-8 pt-8 pb-5 flex-shrink-0 dark:bg-neutral-900 dark:border-neutral-900', className)}>

      {/* ── Title row ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <AgentIcon
            size={16}
            className={cn('flex-shrink-0', meta.color, isAnyRunning && 'animate-pulse')}
            strokeWidth={1.75}
          />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight dark:text-slate-100">{agentName}</h1>
          {isAnyRunning && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Search · Star · More */}
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <Search size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-500 transition-colors">
            <Star size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* ── Last 3 leads breadcrumb ── */}
      <div className="pl-6 mb-5 min-h-[18px]">
        {recentLeads.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 text-xs select-none dark:text-slate-600">└</span>
            {recentLeads.map((lead, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300 text-xs dark:text-slate-600">/</span>}
                <span className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 cursor-pointer transition-colors">
                  <span className="w-3 h-3 rounded-sm border border-gray-300 dark:border-slate-600 flex-shrink-0 dark:border-slate-600" />
                  {lead.company_name}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Agent stats row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">

          {/* Status */}
          {statusStyle && (
            <div className="flex items-center gap-1.5">
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusStyle.dot)} />
              <span className="text-xs text-gray-500 dark:text-slate-400">{statusStyle.label}</span>
            </div>
          )}

          {statusStyle && lastRunAt && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}

          {/* Last run */}
          {lastRunAt && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              Last run <span className="text-gray-600 font-medium dark:text-slate-300">{formatRelativeTime(lastRunAt)}</span>
            </span>
          )}

          {lastRunAt && runs24h > 0 && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}

          {/* 24h runs */}
          {runs24h > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              <span className="text-gray-600 font-medium dark:text-slate-300">{runs24h}</span> runs today
            </span>
          )}

          {runs24h > 0 && recentLeads.length > 0 && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}

          {/* Recent leads count */}
          {recentLeads.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              <span className="text-gray-600 font-medium dark:text-slate-300">{recentLeads.length}</span> recent leads
            </span>
          )}

        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
        <button
            onClick={() => setLogsOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-2xl text-gray-600 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-700 transition-colors"
        >
            <AudioLines size={16} strokeWidth={2} />
        </button>
        <button
            onClick={() => !isAnyRunning && runMutation.mutate()}
            disabled={runMutation.isPending || !activeAgent || isAnyRunning}
            title={isAnyRunning ? `${agentName} is running…` : 'Run agent'}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-2xl font-medium transition-colors',
              isAnyRunning
                ? 'bg-stone-400 text-white cursor-not-allowed'
                : 'bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500'
            )}
        >
            <CirclePlay size={16} strokeWidth={2} className={isAnyRunning ? 'animate-pulse' : ''} />
        </button>
        </div>
      </div>

    </header>

    {logsOpen && isAnyRunning && liveExecution && (
      <LiveRunPanel
        leadId={liveExecution.lead_id}
        leadName={liveExecution.lead_name}
        onClose={() => setLogsOpen(false)}
      />
    )}
    {logsOpen && !isAnyRunning && (
      <AgentLogsPanel
        agentType={activeAgent?.agent_type ?? null}
        agentName={agentName}
        onClose={() => setLogsOpen(false)}
      />
    )}
  </>
  )
}
