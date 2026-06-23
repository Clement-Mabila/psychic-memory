'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Cookies from 'js-cookie'
import { X, Bot, Zap, DollarSign, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface UsageData {
  period_days: number
  totals: {
    claude_usd: number
    external_usd: number
    total_usd: number
    claude_calls: number
    external_calls: number
  }
  budget_usd: number | null
  budget_remaining_usd: number | null
  budget_pct_used: number | null
  month_spent_usd: number
  alert_at_pct: number
  daily_trend: Array<{ date: string; claude_usd: number; external_usd: number; total_usd: number }>
  claude_by_agent: Array<{ agent_type: string; cost_usd: number; calls: number }>
  external_by_service: Array<{ service: string; cost_usd: number; calls: number; units_used: number }>
  role: string
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchMyUsage(period: string): Promise<UsageData> {
  const token = Cookies.get('access_token')
  const { data } = await axios.get(`/api/system/usage/my?period=${period}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PERIODS = ['7d', '30d', '90d'] as const
type Period = typeof PERIODS[number]

function fmt(usd: number) {
  if (usd === 0) return '$0.00'
  return usd < 1 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}

function fmtAgent(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const SERVICE_COLOR: Record<string, string> = {
  zerobounce:  'bg-blue-500',
  hunter:      'bg-amber-500',
  apollo:      'bg-purple-500',
  enrichlayer: 'bg-emerald-500',
  serper:      'bg-rose-500',
}

// ── Budget bar ────────────────────────────────────────────────────────────────
function BudgetBar({ pct, alertPct }: { pct: number; alertPct: number }) {
  const color = pct >= 100 ? 'bg-red-500' : pct >= alertPct ? 'bg-amber-400' : 'bg-cyan-500'
  return (
    <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-700 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

// ── Daily bar chart ───────────────────────────────────────────────────────────
function DailyBars({ trend }: { trend: UsageData['daily_trend'] }) {
  if (trend.length < 2) return null
  const days   = trend.slice(-30)
  const maxVal = Math.max(...days.map(d => d.total_usd), 0.0001)

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">Daily spend</p>
      <div className="flex items-end gap-px h-14">
        {days.map((d, i) => {
          const barPct    = d.total_usd / maxVal
          const claudeH   = d.total_usd > 0 ? d.claude_usd / d.total_usd : 0
          const externalH = 1 - claudeH
          return (
            <div key={i}
              className="group relative flex-1 flex flex-col justify-end h-full"
              title={`${d.date.slice(5)}: ${fmt(d.total_usd)}`}
            >
              {/* Bar */}
              <div
                className="w-full rounded-sm overflow-hidden"
                style={{ height: `${Math.max(barPct * 100, 3)}%` }}
              >
                <div className="w-full bg-blue-400 dark:bg-blue-500" style={{ height: `${claudeH * 100}%` }} />
                <div className="w-full bg-amber-400 dark:bg-amber-500" style={{ height: `${externalH * 100}%` }} />
              </div>
              {/* Hover tooltip */}
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden group-hover:block">
                <div className="bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                  {d.date.slice(5)}: {fmt(d.total_usd)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-sm bg-blue-400 dark:bg-blue-500 inline-block" />Claude
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-sm bg-amber-400 dark:bg-amber-500 inline-block" />External
        </span>
      </div>
    </div>
  )
}

// ── UsageModal ────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
}

export function UsageModal({ open, onClose }: Props) {
  const [period, setPeriod] = useState<Period>('30d')

  const { data, isLoading, isError } = useQuery<UsageData>({
    queryKey: ['my-usage', period],
    queryFn:  () => fetchMyUsage(period),
    refetchInterval: 60_000,
    staleTime: 55_000,
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-700 flex flex-col overflow-hidden max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-50 dark:bg-cyan-950/60">
              <Gauge size={14} className="text-cyan-600" strokeWidth={1.75} />
            </span>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-neutral-100">My Usage</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Period tabs */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-neutral-800 rounded-lg p-0.5">
              {PERIODS.map(p => (
                <button key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    period === p
                      ? 'bg-white dark:bg-neutral-700 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
                  )}
                >{p}</button>
              ))}
            </div>

            <button onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {isLoading && (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400">
              Loading…
            </div>
          )}

          {isError && (
            <div className="flex items-center justify-center h-32 text-sm text-red-500">
              Failed to load usage data.
            </div>
          )}

          {data && (
            <>
              {/* Budget row — only shown when a budget is configured */}
              {data.budget_usd != null && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly budget</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {fmt(data.month_spent_usd)}
                      <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
                      {fmt(data.budget_usd)}
                      {data.budget_pct_used != null && (
                        <span className={cn(
                          'ml-1.5 text-[11px]',
                          data.budget_pct_used >= data.alert_at_pct ? 'text-amber-500' : 'text-slate-400',
                        )}>
                          ({data.budget_pct_used}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <BudgetBar pct={data.budget_pct_used ?? 0} alertPct={data.alert_at_pct} />
                  {data.budget_remaining_usd != null && data.budget_remaining_usd > 0 && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {fmt(data.budget_remaining_usd)} remaining this month
                    </p>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="grid grid-cols-3 gap-2.5">
                {([
                  { label: 'Claude AI',     value: data.totals.claude_usd,   calls: data.totals.claude_calls,                                    Icon: Bot,         colorText: 'text-blue-500',  colorBg: 'bg-blue-50 dark:bg-blue-950/40'   },
                  { label: 'External APIs', value: data.totals.external_usd, calls: data.totals.external_calls,                                   Icon: Zap,         colorText: 'text-amber-500', colorBg: 'bg-amber-50 dark:bg-amber-950/40' },
                  { label: 'Total',         value: data.totals.total_usd,    calls: data.totals.claude_calls + data.totals.external_calls,         Icon: DollarSign,  colorText: 'text-cyan-600',  colorBg: 'bg-cyan-50 dark:bg-cyan-950/40'   },
                ] as const).map(card => (
                  <div key={card.label} className={cn('rounded-xl p-3.5', card.colorBg)}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <card.Icon size={12} className={card.colorText} strokeWidth={2} />
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
                    </div>
                    <p className={cn('text-lg font-semibold tabular-nums leading-none', card.colorText)}>{fmt(card.value)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{card.calls.toLocaleString()} calls</p>
                  </div>
                ))}
              </div>

              {/* Daily trend */}
              <DailyBars trend={data.daily_trend} />

              {/* Breakdowns */}
              {(data.claude_by_agent.length > 0 || data.external_by_service.length > 0) && (
                <div className="grid grid-cols-2 gap-5">

                  {data.claude_by_agent.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Claude by agent</p>
                      <div className="space-y-1.5">
                        {data.claude_by_agent.map(row => (
                          <div key={row.agent_type} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate">{fmtAgent(row.agent_type)}</span>
                            <span className="text-xs tabular-nums text-blue-500 font-medium shrink-0">{fmt(row.cost_usd)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.external_by_service.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">External by service</p>
                      <div className="space-y-1.5">
                        {data.external_by_service.map(row => (
                          <div key={row.service} className="flex items-center gap-2">
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', SERVICE_COLOR[row.service] ?? 'bg-slate-400')} />
                            <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 capitalize truncate">{row.service}</span>
                            <span className="text-xs tabular-nums text-amber-500 font-medium shrink-0">{fmt(row.cost_usd)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Empty state */}
              {data.totals.total_usd === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                  No usage recorded in the last {period}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
