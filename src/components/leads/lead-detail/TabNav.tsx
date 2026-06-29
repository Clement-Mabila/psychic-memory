import { cn } from '@/lib/utils'
import { TABS } from './constants'
import type { LeadTab } from './types'

interface Props {
  active: LeadTab
  onChange: (t: LeadTab) => void
}

export function TabNav({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'px-4 py-2 text-xs relative transition-colors whitespace-nowrap',
            active === id
              ? 'text-violet-600 dark:text-violet-400 font-medium'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
          )}
        >
          {label}
          {active === id && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 dark:bg-violet-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}
