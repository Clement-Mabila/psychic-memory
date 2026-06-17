import { cn } from '@/lib/utils'

interface ModelBadgeProps {
  model?: string
  fallback?: boolean
  latency_ms?: number
  cost_usd?: number
  className?: string
}

const MODEL_LABELS: Record<string, string> = {
  'mbody-critic-qwen3':         'Qwen3-30B',
  'claude-haiku-4-5-20251001':  'Haiku',
  'llm_30b':                    'Qwen3-30B',
}

export function ModelBadge({ model, fallback, latency_ms, cost_usd, className }: ModelBadgeProps) {
  if (!model) return null
  const label = MODEL_LABELS[model] ?? model

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
      fallback
        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
        : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
      className,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', fallback ? 'bg-amber-500' : 'bg-emerald-500')} />
      {label}
      {latency_ms !== undefined && <span className="opacity-60">{latency_ms}ms</span>}
      {cost_usd !== undefined && cost_usd > 0 && (
        <span className="opacity-60">${cost_usd.toFixed(4)}</span>
      )}
    </span>
  )
}
