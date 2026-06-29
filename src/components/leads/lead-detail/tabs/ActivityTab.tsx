import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import { EVENT_STYLE } from '../constants'

interface Props {
  events: any[]
  agentRuns: any[]
  totalCost: number
}

export function ActivityTab({ events, agentRuns, totalCost }: Props) {
  if (events.length === 0 && agentRuns.length === 0) {
    return (
      <div className="border border-gray-100 dark:border-neutral-800 rounded-xl p-14 text-center">
        <Clock className="h-8 w-8 mx-auto mb-3 text-slate-300 dark:text-slate-600 opacity-30" />
        <p className="text-sm text-slate-400 dark:text-slate-500">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {events.length > 0 && (
        <div className="border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/60 dark:bg-neutral-800/30 border-b border-gray-100 dark:border-neutral-800">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Events</p>
          </div>
          {events.map((ev: any, i: number) => (
            <div
              key={ev.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                i < events.length - 1 && 'border-b border-gray-50 dark:border-neutral-800',
              )}
            >
              <span className={cn(
                'text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0',
                EVENT_STYLE[ev.event_type] ?? 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-slate-400',
              )}>
                {ev.event_type.replace(/_/g, ' ')}
              </span>
              {ev.old_stage && ev.new_stage && ev.old_stage !== ev.new_stage && (
                <span className="text-xs text-gray-400 dark:text-slate-500 flex-1 truncate">
                  {ev.old_stage} → {ev.new_stage}
                </span>
              )}
              <span className="flex-1" />
              <span className="text-[10px] text-gray-300 dark:text-slate-600 flex-shrink-0">
                {ev.created ? formatRelativeTime(ev.created) : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {agentRuns.length > 0 && (
        <div className="border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/60 dark:bg-neutral-800/30 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Agent Runs</p>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {agentRuns.length} total · ${totalCost.toFixed(4)}
            </span>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-1.5">
            {agentRuns.map((ae: any) => (
              <span
                key={ae.id}
                title={`${ae.agent_type} · ${ae.status}${ae.latency_ms ? ` · ${ae.latency_ms}ms` : ''}${ae.cost_usd ? ` · $${ae.cost_usd.toFixed(4)}` : ''}`}
                className={cn(
                  'text-[10px] px-2.5 py-1 rounded-full font-medium cursor-default',
                  ae.status === 'success'  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    : ae.status === 'failed' ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-slate-400',
                )}
              >
                {ae.agent_type.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
