'use client'

import { cn } from '@/lib/utils'
import { AGENT_META, NAV_GROUPS } from './AgentMeta'

interface AgentNavSidebarProps {
  activeAgent: string
  onSelect: (agent: string) => void
}

export function AgentNavSidebar({ activeAgent, onSelect }: AgentNavSidebarProps) {
  return (
    <div className="w-[260px] flex-shrink-0 overflow-y-auto py-4 px-3 space-y-1 bg-gray-50 dark:bg-neutral-950">
      {NAV_GROUPS.map(group => (
        <div key={group.title} className="mb-3">
          <p className="text-xs uppercase font-normal text-stone-500 dark:text-slate-400 tracking-wider px-2 mb-1.5">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.types.map(type => {
              const m = AGENT_META[type]
              if (!m) return null
              const Icon     = m.icon
              const isActive = activeAgent === type
              return (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-all',
                    isActive
                      ? 'bg-white dark:bg-slate-900 shadow-sm dark:shadow-none text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                >
                  <Icon
                    size={15}
                    className={isActive ? m.color : 'text-stone-500 dark:text-slate-400'}
                    strokeWidth={1.75}
                  />
                  <span className="truncate text-stone-500 dark:text-slate-400 text-xs">{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}