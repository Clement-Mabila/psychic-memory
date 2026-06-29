import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import { StatCards } from '../shared/StatCards'
import { EVENT_STYLE } from '../constants'
import type { LeadTab } from '../types'

interface Props {
  lead: any
  contacts: any[]
  events: any[]
  onTabChange: (t: LeadTab) => void
}

export function OverviewTab({ lead, contacts, events, onTabChange }: Props) {
  return (
    <div>
      <StatCards lead={lead} contacts={contacts} />

      {lead.qualification_summary && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            About {lead.company_name}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {lead.qualification_summary}
          </p>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
            <button
              onClick={() => onTabChange('activity')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden">
            {events.slice(0, 5).map((ev: any, i: number) => (
              <div
                key={ev.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  i < Math.min(events.length, 5) - 1 && 'border-b border-gray-50 dark:border-neutral-800',
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
        </div>
      )}

      {!lead.qualification_summary && events.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-10 text-center">
          No summary or activity yet — run the pipeline to populate this account.
        </p>
      )}
    </div>
  )
}
