'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { VerdictStatCard } from './VerdictStatCard'
import { VerdictList }     from './VerdictList'
import api from '@/lib/api'

export function VerdictsTab() {
  const [days, setDays] = useState(30)

  const { data: statsData } = useQuery({
    queryKey: ['verdict-stats', days],
    queryFn:  () => api.get('/verdicts/stats', { params: { days } }).then(r => r.data),
  })

  const stats = (statsData?.critics ?? []) as any[]

  return (
    <div className="space-y-5">

      {/* Period selector */}
      <div className="flex items-center gap-1.5">
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              'px-3 py-2 rounded-2xl text-xs font-normaltransition-colors border',
              days === d
                ? 'bg-cyan-500 text-white'
                : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-slate-600',
            )}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-50 dark:bg-neutral-800 rounded-2xl animate-pulse" />
            ))
          : stats.map((s: any) => <VerdictStatCard key={s.critic_id} stat={s} />)}
      </div>

      <VerdictList />

    </div>
  )
}
