'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { LLMRouterBar }  from './LLMRouterBar'
import { ReadinessCard } from './ReadinessCard'
import { TriggerPanel }  from './TriggerPanel'
import api from '@/lib/api'

export function TrainingTab() {
  const { data: readiness, refetch: refetchReadiness } = useQuery({
    queryKey: ['training-readiness'],
    queryFn:  () => api.get('/training/readiness').then(r => r.data),
  })

  const configMutation = useMutation({
    mutationFn: (payload: object) => api.patch('/training/config', payload),
    onSuccess:  () => refetchReadiness(),
  })

  const critics    = (readiness?.critics ?? []) as any[]
  const hasRunning = false  // job state now lives in ModelsTab › Training Log

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-normal text-slate-800 dark:text-slate-200 mb-3">
          Local training status and management · fine-tune your own model with auto-labeling
        </p>
        <LLMRouterBar
          global={readiness?.global}
          onToggle={enabled => configMutation.mutate({ llm_critic_enabled: enabled })}
        />
      </div>

      <div>
        <p className="text-sm font-normal text-slate-600 dark:text-slate-400 mb-3">
          Training Readiness · 500 verdicts triggers auto fine-tune
        </p>
        <div className="grid grid-cols-3 2xl:grid-cols-4 gap-3">
          {critics.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-50 dark:bg-neutral-800 rounded-2xl animate-pulse" />
              ))
            : critics.map((c: any) => <ReadinessCard key={c.critic_id} critic={c} />)}
        </div>
      </div>

      <TriggerPanel hasRunningJob={hasRunning} />
    </div>
  )
}
