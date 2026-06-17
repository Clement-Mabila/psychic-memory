'use client'

import { Zap } from 'lucide-react'
import { CardShell, Skel, Divider, DistBar, IconTile, STAGE_CONFIG } from './shared'

interface Props {
  funnel: { stage: string; label: string; count: number }[]
  loading: boolean
}

export function PipelineFunnel({ funnel, loading }: Props) {
  const active = funnel.filter(f => f.count > 0)
  const total  = active.reduce((s, f) => s + f.count, 0) || 1

  return (
    <CardShell className="px-6 pt-6 pb-5 flex flex-col">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Pipeline Funnel</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
        {loading
          ? <Skel className="inline-block h-3 w-40" />
          : `${total.toLocaleString()} companies in pipeline`
        }
      </p>

      {loading
        ? <Skel className="h-2 w-full rounded-full mb-5" />
        : active.length > 0 && (
          <DistBar segments={active.map(f => ({
            pct: Math.round(f.count / total * 100),
            bar: STAGE_CONFIG[f.stage]?.bar ?? 'bg-slate-400',
          }))} />
        )
      }

      {/* maxHeight: 264px — matches row-2 peers for consistent card height */}
      <div
        className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ maxHeight: '264px' }}
      >
        {loading && [0, 1, 2, 3, 4].map(i => (
          <div key={i}>
            <div className="flex items-center gap-3 py-3">
              <Skel className="w-8 h-8 rounded-xl" />
              <Skel className="flex-1 h-4" />
              <Skel className="w-8 h-4" />
            </div>
            {i < 4 && <Divider />}
          </div>
        ))}

        {!loading && active.map((f, i) => {
          const cfg     = STAGE_CONFIG[f.stage]
          const Icon    = cfg?.Icon    ?? Zap
          const tile    = cfg?.tile    ?? 'bg-slate-300/10'
          const iconCls = cfg?.iconCls ?? 'text-slate-400'
          const pct     = Math.round(f.count / total * 100)
          return (
            <div key={f.stage}>
              <div className="flex items-center gap-3 py-3">
                <IconTile tile={tile} Icon={Icon} iconCls={iconCls} />
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{f.label}</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{f.count}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right tabular-nums">{pct}%</span>
              </div>
              {i < active.length - 1 && <Divider />}
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}
