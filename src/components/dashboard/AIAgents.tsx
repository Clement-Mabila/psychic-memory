'use client'

import { cn } from '@/lib/utils'
import { AGENT_META } from '@/components/agents/AgentMeta'
import { CardShell, Skel, type AgentStat } from './shared'

interface Props {
  agentStats: AgentStat[]
  loading: boolean
}

const CATEGORY: Record<string, { section: string; order: number }> = {
  discovery:             { section: 'Pipeline',  order: 0 },
  research:              { section: 'Pipeline',  order: 1 },
  company_intel:         { section: 'Pipeline',  order: 2 },
  contact:               { section: 'Pipeline',  order: 3 },
  enrichment:            { section: 'Pipeline',  order: 4 },
  qualification:         { section: 'Pipeline',  order: 5 },
  handoff:               { section: 'Pipeline',  order: 6 },
  research_critic:       { section: 'Critics',   order: 0 },
  contact_critic:        { section: 'Critics',   order: 1 },
  enrichment_critic:     { section: 'Critics',   order: 2 },
  qualification_critic:  { section: 'Critics',   order: 3 },
  outreach_critic:       { section: 'Critics',   order: 4 },
  supervisor_critic:     { section: 'Critics',   order: 5 },
  system_llm:            { section: 'Models',    order: 0 },
}

function groupStats(stats: AgentStat[]) {
  const map: Record<string, AgentStat[]> = { Pipeline: [], Critics: [], Models: [] }
  for (const s of stats) {
    const cat = CATEGORY[s.agent_type]?.section ?? 'Pipeline'
    map[cat].push(s)
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => (CATEGORY[a.agent_type]?.order ?? 99) - (CATEGORY[b.agent_type]?.order ?? 99))
  }
  return map
}

function AgentRow({ stat }: { stat: AgentStat }) {
  const meta = AGENT_META[stat.agent_type] ?? {
    label: stat.agent_type, icon: (() => null) as any,
    color: 'text-slate-400', iconBg: 'bg-slate-100 dark:bg-neutral-800',
    cardColor: '', accentBorder: '',
  }
  const Icon = meta.icon

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-100 dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700">
      {/* Icon */}
      <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0', meta.iconBg)}>
        <Icon size={13} className={meta.color} strokeWidth={1.75} />
      </div>

      {/* Name */}
      <span className="text-xs font-semibold text-slate-900 dark:text-white w-[110px] shrink-0 truncate">
        {meta.label}
      </span>

      {/* Stats — plain text, no badges */}
      <span className="flex-1 text-xs text-slate-500 dark:text-slate-400 truncate min-w-0">
        {stat.total_runs > 0
          ? `${stat.total_runs.toLocaleString()} ${stat.action_label} · ${stat.performance_pct}%`
          : 'no runs yet'
        }
      </span>
    </div>
  )
}

export function AIAgents({ agentStats, loading }: Props) {
  const grouped  = groupStats(agentStats)
  const sections = Object.entries(grouped).filter(([, items]) => items.length > 0)

  return (
    <CardShell className="px-6 pt-6 pb-5 flex flex-col">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI Agents</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
        {loading
          ? <Skel className="inline-block h-3 w-44" />
          : `${agentStats.length} agents · ${agentStats.reduce((s, a) => s + a.total_runs, 0).toLocaleString()} total runs`
        }
      </p>

      {/*
        maxHeight: 264px — matches PeoplePanel/ActivityFeedCard from Checklist
        so all three cards in the row are always the same visual height.
      */}
      <div
        className="flex flex-col gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ maxHeight: '264px' }}
      >
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <Skel key={i} className="h-12 w-full rounded-xl" />
        ))}

        {!loading && sections.map(([section, items]) => (
          <div key={section}>
            <p className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-1.5 px-0.5">
              {section}
            </p>
            <div className="flex flex-col gap-1.5">
              {items.map(s => <AgentRow key={s.agent_type} stat={s} />)}
            </div>
          </div>
        ))}

        {!loading && agentStats.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
            No agent executions recorded yet.
          </p>
        )}
      </div>
    </CardShell>
  )
}
