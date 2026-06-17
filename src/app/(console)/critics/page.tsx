'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Pencil, Check, ChevronDown, ChevronUp, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AGENT_META } from '@/components/agents/AgentMeta'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

const CRITIC_STAGE: Record<string, string> = {
  research_critic:      'Research stage',
  contact_critic:       'Contact stage',
  enrichment_critic:    'Enrichment stage',
  qualification_critic: 'Qualification stage',
  outreach_critic:      'Outreach stage',
  supervisor_critic:    'All stages',
}

type Period = '7d' | '30d' | 'all'

const PERIODS: { id: Period; label: string }[] = [
  { id: '7d',  label: 'Delta' },
  { id: '30d', label: 'Epoch' },
  { id: 'all', label: 'Cumulative' },
]

function PeriodSwitcher({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center border-none rounded-xl overflow-hidden p-0.5 gap-0.5">
      {PERIODS.map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)}
          className={cn(
            'flex items-center px-3 py-1.5 text-xs rounded-lg transition-colors font-normal',
            period === id
              ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800',
          )}>
          {label}
        </button>
      ))}
    </div>
  )
}

export default function CriticsPage() {
  const [period, setPeriod] = useState<Period>('all')

  const { data, refetch } = useQuery({
    queryKey: ['critics'],
    queryFn:  () => api.get('/critics/').then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) =>
      api.patch(`/critics/${id}/`, payload),
    onSuccess: () => refetch(),
  })

  const critics = data?.critics ?? []

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Quality Gate Intelligence</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {critics.filter((c: any) => c.enabled).length} gates active · verdicts enforced on next pipeline run
          </p>
        </div>
        <PeriodSwitcher period={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-3 2xl:grid-cols-4 gap-3">
        {critics.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-50 dark:bg-neutral-800 rounded-2xl animate-pulse" />
            ))
          : critics.map((c: any) => (
              <CriticCard key={c.critic_id} critic={c} period={period}
                onUpdate={(payload) => updateMutation.mutate({ id: c.critic_id, payload })}
                updating={updateMutation.isPending} />
            ))}
      </div>
    </div>
  )
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', enabled ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-neutral-600')} />
  )
}

type TrendResult = { label: string; color: string }

function computeTrend(stats: any): TrendResult | null {
  const w = stats?.['7d']
  const m = stats?.['30d']
  if (!w || !m || w.total < 2 || m.total < 2) return null
  const delta = w.approval_pct - m.approval_pct
  if (delta >= 8)  return { label: 'Adaptive',  color: 'text-pink-500 dark:text-pink-400' }
  if (delta <= -8) return { label: 'Recalibrating', color: 'text-orange-500 dark:text-orange-400' }
  return               { label: 'Nominal',   color: 'text-cyan-500 dark:text-cyan-400'      }
}

const PERIOD_LABEL: Record<Period, string> = {
  '7d':  'delta',
  '30d': 'epoch',
  'all': 'cumulative',
}

function ScorePill({ stats, period }: { stats: any; period: Period }) {
  const s        = stats?.[period] ?? {}
  const score    = s.avg_score ?? 0
  const barColor = score >= 70 ? 'bg-emerald-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
  const trend    = computeTrend(stats)

  return (
    <div className="rounded-lg bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-700 px-3 py-2.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-stone-600 dark:text-slate-400">
          {s.total ?? 0} runs {PERIOD_LABEL[period]} · {(s.approval_pct ?? 0).toFixed(0)}% approved
          {trend && <span className={cn('font-medium', trend.color)}> · {trend.label}</span>}
        </span>
        <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 flex-shrink-0">{Math.min(score, 100).toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-1.5">
        <div className={cn('h-1.5 rounded-full transition-all', barColor)} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  )
}

function fmtCost(usd: number | null | undefined): string {
  if (usd == null) return '—'
  if (usd < 0.001) return '< $0.001'
  return `$${usd.toFixed(3)}`
}

function CriticCard({ critic, period, onUpdate, updating }: { critic: any; period: Period; onUpdate: (p: object) => void; updating: boolean }) {
  const [editingScore, setEditingScore]   = useState(false)
  const [score, setScore]                 = useState(critic.min_pass_score ?? '')
  const [showPrompt, setShowPrompt]       = useState(false)
  const [promptText, setPromptText]       = useState(critic.prompt_override ?? '')
  const [editingPrompt, setEditingPrompt] = useState(false)

  const meta = AGENT_META[critic.critic_id] ?? {
    icon: Circle,
    color: 'text-gray-400 dark:text-neutral-500',
    iconBg: 'bg-gray-100 dark:bg-neutral-800',
    label: critic.name,
  }
  const Icon     = meta.icon
  const stage    = CRITIC_STAGE[critic.critic_id] ?? `${critic.stage} stage`
  const pStats   = critic.stats?.[period] ?? {}

  const costPerRun  = fmtCost(pStats.avg_cost_usd)
  const totalCost   = fmtCost(pStats.total_cost_usd)
  const costDisplay = costPerRun === '—' ? '—' : `${costPerRun} / run · ${totalCost} total`

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 shadow-sm dark:shadow-none flex flex-col w-full overflow-hidden">

      {/* ── Inner gray card ── */}
      <div className="m-3 rounded-xl bg-stone-100 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 px-4 pt-4 pb-4 flex flex-col gap-3">

        {/* Icon + label + enabled badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', meta.iconBg)}>
              <Icon size={18} className={meta.color} strokeWidth={1.75} />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 tracking-tight">
              {meta.label}
            </h2>
          </div>
          <EnabledBadge enabled={critic.enabled} />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
          Monitors the <span className="font-medium text-gray-700 dark:text-slate-300">{stage.toLowerCase()}</span> and
          scores each record before it advances to the next pipeline stage.
        </p>

        {/* Divider */}
        <div className="h-px bg-gray-200 dark:bg-neutral-600" />

        {/* Avg score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">Avg score</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{pStats.avg_score ?? '—'}</span>
        </div>

        {/* Score performance pill */}
        <ScorePill stats={critic.stats} period={period} />

        {/* Watching */}
        <div className="flex items-start justify-between gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">Watching</span>
          <span className="text-sm font-medium text-gray-900 dark:text-slate-100 text-right">{stage}</span>
        </div>

        {/* Pass score */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">Pass score</span>
          {editingScore ? (
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} max={100} value={score}
                onChange={e => setScore(e.target.value)}
                className="w-14 h-6 border border-gray-200 dark:border-neutral-600 rounded-md text-xs px-2 text-center bg-white dark:bg-neutral-900 text-gray-800 dark:text-neutral-200 outline-none focus:border-indigo-400"
                placeholder={String(critic.default_score)} />
              <button onClick={() => { onUpdate({ min_pass_score: score === '' ? null : Number(score) }); setEditingScore(false) }}
                className="w-5 h-5 flex items-center justify-center rounded bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
                <Check size={10} />
              </button>
              <button onClick={() => setEditingScore(false)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-900 dark:text-slate-100">{critic.effective_score}</span>
              {critic.min_pass_score != null
                ? <Badge variant="warning" className="text-xs">Custom</Badge>
                : <Badge variant="neutral" className="text-xs font-normal bg-stone-300 dark:bg-neutral-900">Default</Badge>}
              <button onClick={() => setEditingScore(true)}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                <Pencil size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Cost */}
        <div className="flex items-start justify-between gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">Cost</span>
          <span className="text-xs font-semibold text-gray-900 dark:text-slate-100 text-right">{costDisplay}</span>
        </div>

      </div>

      {/* ── Footer: enable toggle + prompt ── */}
      <div className="px-5 pb-4 pt-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={cn('w-8 h-5 rounded-full transition-colors relative', critic.enabled ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-neutral-600')}>
              <div className={cn('absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-all', critic.enabled ? 'left-4' : 'left-0.5')} />
            </div>
            <input type="checkbox" checked={critic.enabled}
              onChange={e => onUpdate({ enabled: e.target.checked })}
              className="sr-only" />
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {critic.enabled ? 'Active' : 'Inactive'}
            </span>
          </label>

          <button onClick={() => setShowPrompt(s => !s)}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
            {showPrompt ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Prompt
            {critic.prompt_override && <Badge variant="warning" className="ml-1 text-[9px]">custom</Badge>}
          </button>
        </div>

        {showPrompt && (
          <div>
            {editingPrompt ? (
              <div>
                <textarea value={promptText} onChange={e => setPromptText(e.target.value)} rows={8}
                  className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 resize-y" />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="primary" loading={updating}
                    onClick={() => { onUpdate({ prompt_override: promptText }); setEditingPrompt(false) }}>
                    Save
                  </Button>
                  <Button size="sm" variant="danger"
                    onClick={() => { onUpdate({ prompt_override: '' }); setPromptText(''); setEditingPrompt(false) }}>
                    Reset
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                <pre className="bg-stone-100 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-lg p-3 text-[10px] font-mono text-gray-600 dark:text-neutral-400 overflow-auto max-h-36 whitespace-pre-wrap">
                  {critic.prompt_override || '(code default)'}
                </pre>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => setEditingPrompt(true)}>
                  <Pencil size={10} /> Override
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
