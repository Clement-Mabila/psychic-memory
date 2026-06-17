'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign, Zap, BarChart2, RefreshCw, Star,
  Cpu, Mail, CheckSquare, AlertCircle, Activity,
  ArrowRight, ArrowLeft, Database, HardDrive, Link2,
  ChevronUp, ChevronDown,
  Pentagon, Aperture, Octagon, Circle, Squircle, Atom,
  TrendingUp, Layers2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00'
  if (usd < 0.0001) return `$${usd.toFixed(8)}`
  if (usd < 0.01)   return `$${usd.toFixed(6)}`
  if (usd < 1)      return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

const MODEL_COLOURS: Record<string, { bar: string; badge: string }> = {
  'claude-haiku-4-5-20251001': { bar: 'bg-indigo-50 dark:bg-indigo-950/40',  badge: 'default'  },
  'claude-sonnet-4-6':         { bar: 'bg-purple-50 dark:bg-purple-950/400',  badge: 'purple'   },
  'claude-opus-4-6':           { bar: 'bg-rose-500',    badge: 'danger'   },
}

const AGENT_COLOURS: Record<string, string> = {
  discovery:            'bg-indigo-400',
  research:             'bg-purple-400',
  company_intel:        'bg-sky-400',
  contact:              'bg-pink-400',
  enrichment:           'bg-orange-400',
  qualification:        'bg-emerald-400',
  handoff:              'bg-teal-400',
  research_critic:      'bg-fuchsia-400',
  contact_critic:       'bg-rose-400',
  enrichment_critic:    'bg-amber-400',
  qualification_critic: 'bg-cyan-400',
  outreach_critic:      'bg-lime-400',
  supervisor_critic:    'bg-fuchsia-50 dark:bg-fuchsia-950/400',
}

const AGENT_SHAPES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  discovery:            { icon: Pentagon,  color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-950/40'  },
  research:             { icon: Aperture,  color: 'text-purple-600 dark:text-purple-400',  bg: 'bg-purple-50 dark:bg-purple-950/40'  },
  company_intel:        { icon: Octagon,   color: 'text-sky-600 dark:text-sky-400',     bg: 'bg-sky-50 dark:bg-sky-950/40'     },
  contact:              { icon: Aperture,  color: 'text-pink-600',    bg: 'bg-pink-50'    },
  enrichment:           { icon: Circle,    color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-950/40'  },
  qualification:        { icon: Squircle,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  handoff:              { icon: Pentagon,  color: 'text-teal-600',    bg: 'bg-teal-50'    },
  research_critic:      { icon: Squircle,  color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40' },
  contact_critic:       { icon: Atom,      color: 'text-rose-600',    bg: 'bg-rose-50'    },
  enrichment_critic:    { icon: Squircle,  color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40'   },
  qualification_critic: { icon: Atom,      color: 'text-cyan-600',    bg: 'bg-cyan-50'    },
  outreach_critic:      { icon: Atom,      color: 'text-lime-600',    bg: 'bg-lime-50'    },
  supervisor_critic:    { icon: Atom,      color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40' },
  system_llm:           { icon: Atom,      color: 'text-pink-600',    bg: 'bg-pink-50'    },
}

const PERIODS = [
  { label: 'Today',   value: 'today' },
  { label: '7 days',  value: '7d'    },
  { label: '30 days', value: '30d'   },
  { label: 'All time', value: 'all'  },
]

// ── Subcomponents ─────────────────────────────────────────────────────────────

function CostItemRow({
  icon, label, sub, value, iconBg, iconColor,
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  value: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600 dark:text-slate-400 truncate">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-none mt-px">{sub}</p>}
      </div>
      <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 flex-shrink-0">{value}</span>
    </div>
  )
}

interface SummaryRow {
  icon: React.ReactNode
  label: string
  sub?: string
  value: string
  iconBg: string
  iconColor: string
}

function ServiceSummaryCard({
  title, subtitle, meta, sectionLabel, rows, totalLabel, totalValue, loading,
}: {
  title: string
  subtitle: string
  meta: { icon: React.ReactNode; text: string }[]
  sectionLabel: string
  rows: SummaryRow[]
  totalLabel: string
  totalValue: string
  loading?: boolean
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-3 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow duration-200">
      <div>
        <h3 className="text-xs font-semibold text-gray-900 dark:text-slate-100 leading-snug">{title}</h3>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-1">
        {meta.map((m, i) => (
          <div key={i} className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500">
            <span className="flex-shrink-0">{m.icon}</span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>

      <hr className="border-gray-100 dark:border-slate-800" />

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">{sectionLabel}</p>
        {loading
          ? <p className="text-xs text-gray-300 dark:text-slate-600 animate-pulse">Loading…</p>
          : rows.length > 0
            ? rows.map((r, i) => <CostItemRow key={i} {...r} />)
            : <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-1">No data</p>
        }
      </div>

      <hr className="border-gray-100 dark:border-slate-800" />

      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-gray-500 dark:text-slate-400">{totalLabel}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{loading ? '—' : totalValue}</span>
      </div>
    </div>
  )
}

function BarRow({
  label, pct, cost, calls, colour, badgeVariant,
}: {
  label: string
  pct: number
  cost: number
  calls: number
  colour: string
  badgeVariant?: string
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-36 text-xs text-gray-600 dark:text-slate-400 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colour)}
          style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs text-gray-500 dark:text-slate-400 flex-shrink-0">{pct}%</span>
      <span className="w-20 text-right text-xs font-semibold text-gray-800 dark:text-slate-200 flex-shrink-0">{formatCost(cost)}</span>
      <span className="w-16 text-right text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">{calls} calls</span>
    </div>
  )
}

function DailyTrendChart({ data }: { data: { date: string; cost_usd: number; calls: number }[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">No data yet</p>
  }

  const maxCost = Math.max(...data.map(d => d.cost_usd), 0.000001)

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map(d => {
        const heightPct = Math.max(2, (d.cost_usd / maxCost) * 100)
        const day = new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group"
            title={`${day}: ${formatCost(d.cost_usd)} — ${d.calls} calls`}
          >
            <div className="w-full flex flex-col justify-end" style={{ height: '88px' }}>
              <div
                className="w-full bg-indigo-400 group-hover:bg-indigo-50 dark:bg-indigo-950/40 rounded-sm transition-colors"
                style={{ height: `${heightPct}%` }}
              />
            </div>
            {data.length <= 14 && (
              <span className="text-[9px] text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:text-slate-400 hidden sm:block truncate w-full text-center">
                {new Date(d.date).getDate()}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TokenBreakdown({ tokens }: { tokens: { input: number; output: number; cache_read: number; cache_creation: number } }) {
  const total = tokens.input + tokens.output + tokens.cache_read + tokens.cache_creation
  if (total === 0) return <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No token data</p>

  const segments = [
    { label: 'Input',          value: tokens.input,          colour: 'bg-indigo-400', textColour: 'text-indigo-700 dark:text-indigo-400' },
    { label: 'Output',         value: tokens.output,         colour: 'bg-purple-400', textColour: 'text-purple-700 dark:text-purple-400' },
    { label: 'Cache read',     value: tokens.cache_read,     colour: 'bg-sky-400',    textColour: 'text-sky-700 dark:text-sky-400'    },
    { label: 'Cache creation', value: tokens.cache_creation, colour: 'bg-amber-400',  textColour: 'text-amber-700 dark:text-amber-400'  },
  ].filter(s => s.value > 0)

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {segments.map(s => (
          <div
            key={s.label}
            className={cn('h-full transition-all', s.colour)}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${formatTokens(s.value)}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-sm flex-shrink-0', s.colour)} />
            <span className="text-xs text-gray-500 dark:text-slate-400 flex-1">{s.label}</span>
            <span className={cn('text-xs font-semibold', s.textColour)}>{formatTokens(s.value)}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500 text-right">{formatTokens(total)} total tokens</p>
    </div>
  )
}

function ExternalServiceCard({ svc }: { svc: any }) {
  if (svc.status === 'error') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
        <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{svc.name}</p>
          <p className="text-xs text-red-500 dark:text-red-400">Unavailable</p>
        </div>
      </div>
    )
  }

  const Icon = svc.type === 'email_discovery' ? Mail : CheckSquare

  return (
    <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-indigo-500 flex-shrink-0" />
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{svc.name}</p>
        {svc.plan && <Badge variant="neutral">{svc.plan}</Badge>}
        <span className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Connected" />
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">{svc.description}</p>

      {svc.searches && (
        <UsageBar label="Searches" used={svc.searches.used} total={svc.searches.total} pct={svc.searches.pct_used} />
      )}
      {svc.verifications && (
        <UsageBar label="Verifications" used={svc.verifications.used} total={svc.verifications.total} pct={svc.verifications.pct_used} />
      )}
      {svc.credits_available !== undefined && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-slate-400">Credits available</span>
          <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{svc.credits_available.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}

function UsageBar({ label, used, total, pct }: { label: string; used: number; total: number; pct: number }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
        <span>{label}</span>
        <span>{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', pct > 80 ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : 'bg-indigo-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const AGENT_PAGE_SIZE = 5

type CostTab = 'overview' | 'analysis'
const COST_TABS: { id: CostTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',  label: 'Overview',       icon: TrendingUp },
  { id: 'analysis',  label: 'Spend Analysis', icon: Layers2    },
]

export default function CostsPage() {
  const [period, setPeriod]           = useState('30d')
  const [agentOffset, setAgentOffset] = useState(0)
  const [tab, setTab]                 = useState<CostTab>('overview')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['costs', period],
    queryFn:  () => api.get(`/costs?period=${period}`).then(r => r.data),
    staleTime: 60_000,
  })

  const claude    = data?.claude ?? {}
  const external  = data?.external_services ?? []
  const byModel   = claude.by_model   ?? []
  const byAgent   = claude.by_agent   ?? []
  const trend     = claude.daily_trend ?? []
  const tokens    = claude.token_breakdown ?? { input: 0, output: 0, cache_read: 0, cache_creation: 0 }

  const totalTokens = tokens.input + tokens.output + tokens.cache_read + tokens.cache_creation
  const topAgent    = byAgent[0]?.agent_type ?? '—'

  const PERIOD_LABELS: Record<string, string> = {
    today: 'today',
    '7d':  'last 7 days',
    '30d': 'last 30 days',
    all:   'all time',
  }

  return (
    <div className="p-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Cost Breakdown</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Service usage & spend — {PERIOD_LABELS[period]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period tabs */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => { setPeriod(p.value); setAgentOffset(0) }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  period === p.value
                    ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 shadow-sm dark:shadow-none'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw size={13} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab nav — matches training page */}
      <div className="flex items-center mb-6 gap-0.5">
        {COST_TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                tab === t.id
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800',
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <>

      {/* Summary cards — 3 per row */}
      <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 mb-6">

        {/* Card 1 — Claude API */}
        <ServiceSummaryCard
          title="Claude API"
          subtitle="Anthropic Language Models"
          meta={[
            { icon: <Cpu size={11} />, text: `${byModel.length} model${byModel.length !== 1 ? 's' : ''} active` },
            { icon: <Zap size={11} />, text: `${(claude.total_calls ?? 0).toLocaleString()} API calls this period` },
          ]}
          sectionLabel="Spend by Model"
          rows={byModel.map((m: any) => ({
            icon: m.model_id.includes('haiku') ? <Zap size={12} /> : m.model_id.includes('opus') ? <Star size={12} /> : <Cpu size={12} />,
            label: m.label,
            sub: `${m.calls} call${m.calls !== 1 ? 's' : ''}`,
            value: formatCost(m.cost_usd),
            iconBg: m.model_id.includes('haiku') ? 'bg-blue-50 dark:bg-blue-950/40'   : m.model_id.includes('opus') ? 'bg-rose-50'   : 'bg-purple-50 dark:bg-purple-950/40',
            iconColor: m.model_id.includes('haiku') ? 'text-blue-600 dark:text-blue-400' : m.model_id.includes('opus') ? 'text-rose-600' : 'text-purple-600 dark:text-purple-400',
          }))}
          totalLabel="Total Claude Spend"
          totalValue={formatCost(claude.total_cost_usd ?? 0)}
          loading={isLoading}
        />

        {/* Card 2 — Token Consumption */}
        <ServiceSummaryCard
          title="Token Consumption"
          subtitle="Across all pipeline agents"
          meta={[
            { icon: <Database size={11} />, text: `${formatTokens(totalTokens)} tokens consumed` },
            { icon: <Activity size={11} />, text: `${byAgent.length} agent type${byAgent.length !== 1 ? 's' : ''} active` },
          ]}
          sectionLabel="Tokens by Type"
          rows={[
            { icon: <ArrowRight size={12} />, label: 'Input',       sub: 'Prompt context',    value: formatTokens(tokens.input),          iconBg: 'bg-indigo-50 dark:bg-indigo-950/40', iconColor: 'text-indigo-600 dark:text-indigo-400' },
            { icon: <ArrowLeft  size={12} />, label: 'Output',      sub: 'Model responses',   value: formatTokens(tokens.output),         iconBg: 'bg-purple-50 dark:bg-purple-950/40', iconColor: 'text-purple-600 dark:text-purple-400' },
            ...(tokens.cache_read > 0     ? [{ icon: <Database  size={12} />, label: 'Cache Read',  sub: '0.10× input rate', value: formatTokens(tokens.cache_read),     iconBg: 'bg-sky-50 dark:bg-sky-950/40',    iconColor: 'text-sky-600 dark:text-sky-400'    }] : []),
            ...(tokens.cache_creation > 0 ? [{ icon: <HardDrive size={12} />, label: 'Cache Write', sub: '1.25× input rate', value: formatTokens(tokens.cache_creation), iconBg: 'bg-amber-50 dark:bg-amber-950/40',  iconColor: 'text-amber-600 dark:text-amber-400'  }] : []),
          ]}
          totalLabel="Total Tokens"
          totalValue={`${formatTokens(totalTokens)} tok`}
          loading={isLoading}
        />

        {/* Card 3 — Agent Activity */}
        <ServiceSummaryCard
          title="Agent Activity"
          subtitle="Cost breakdown by agent type"
          meta={[
            { icon: <Activity size={11} />, text: `${byAgent.length} agent${byAgent.length !== 1 ? 's' : ''} ran this period` },
            { icon: <DollarSign size={11} />, text: `Top driver: ${topAgent}` },
          ]}
          sectionLabel="Top 3 by Spend"
          rows={byAgent.slice(0, 3).map((a: any) => {
            const shape = AGENT_SHAPES[a.agent_type]
            const ShapeIcon = shape?.icon ?? Circle
            return {
              icon:      <ShapeIcon size={12} strokeWidth={1.75} />,
              label:     a.agent_type,
              sub:       `${a.calls} call${a.calls !== 1 ? 's' : ''} · avg ${formatCost(a.avg_cost)}`,
              value:     formatCost(a.cost_usd),
              iconBg:    shape?.bg    ?? 'bg-gray-50 dark:bg-slate-950',
              iconColor: shape?.color ?? 'text-gray-600 dark:text-slate-400',
            }
          })}
          totalLabel="Total Agent Spend"
          totalValue={formatCost(claude.total_cost_usd ?? 0)}
          loading={isLoading}
        />

        {/* Card 4 — External APIs */}
        <ServiceSummaryCard
          title="External APIs"
          subtitle="3rd-party service credits"
          meta={[
            { icon: <Link2 size={11} />, text: `${external.filter((s: any) => s.status === 'ok').length} of ${external.length} service${external.length !== 1 ? 's' : ''} connected` },
            { icon: <DollarSign size={11} />, text: 'Credit-based billing' },
          ]}
          sectionLabel="Credits Remaining"
          rows={external.flatMap((svc: any): SummaryRow[] => {
            if (svc.status === 'error') return [{ icon: <AlertCircle size={12} />, label: svc.name, sub: 'Unavailable', value: '—', iconBg: 'bg-red-50 dark:bg-red-950/40', iconColor: 'text-red-500 dark:text-red-400' }]
            const rows: SummaryRow[] = []
            if (svc.searches)      rows.push({ icon: <Mail size={12} />,        label: `${svc.name} — Searches`,      sub: `${svc.searches.used.toLocaleString()} used of ${svc.searches.total.toLocaleString()}`,           value: `${svc.searches.available.toLocaleString()} left`,      iconBg: 'bg-blue-50 dark:bg-blue-950/40',  iconColor: 'text-blue-600 dark:text-blue-400'  })
            if (svc.verifications) rows.push({ icon: <CheckSquare size={12} />, label: `${svc.name} — Verifications`, sub: `${svc.verifications.used.toLocaleString()} used of ${svc.verifications.total.toLocaleString()}`, value: `${svc.verifications.available.toLocaleString()} left`, iconBg: 'bg-sky-50 dark:bg-sky-950/40',   iconColor: 'text-sky-600 dark:text-sky-400'   })
            if (svc.credits_available !== undefined) rows.push({ icon: <CheckSquare size={12} />, label: svc.name, sub: svc.description, value: `${svc.credits_available.toLocaleString()} credits`, iconBg: 'bg-green-50 dark:bg-green-950/40', iconColor: 'text-green-600 dark:text-green-400' })
            return rows
          })}
          totalLabel="Services Active"
          totalValue={`${external.filter((s: any) => s.status === 'ok').length} connected`}
          loading={isLoading}
        />

      </div>

      {/* Claude section */}
      <div className="grid grid-cols-[1fr_1fr] gap-5 mb-5">

        {/* By model */}
        <Card>
          <CardHeader>
            <CardTitle>By Model</CardTitle>
            <span className="text-xs text-gray-400 dark:text-slate-500">{byModel.length} model{byModel.length !== 1 ? 's' : ''}</span>
          </CardHeader>
          <CardBody>
            {isLoading && <p className="text-sm text-gray-400 dark:text-slate-500">Loading…</p>}
            {!isLoading && byModel.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">No data for this period</p>
            )}
            <div className="divide-y divide-gray-50 dark:divide-slate-800">
              {byModel.map((m: any) => (
                <div key={m.model_id}>
                  <BarRow
                    label={m.label}
                    pct={m.pct}
                    cost={m.cost_usd}
                    calls={m.calls}
                    colour={MODEL_COLOURS[m.model_id]?.bar ?? 'bg-gray-400'}
                    badgeVariant={MODEL_COLOURS[m.model_id]?.badge ?? 'neutral'}
                  />
                  {/* Token detail row */}
                  <div className="flex gap-4 pb-2 pl-[150px] text-[10px] text-gray-400 dark:text-slate-500">
                    <span>In: {formatTokens(m.input_tokens)}</span>
                    <span>Out: {formatTokens(m.output_tokens)}</span>
                    {m.cache_read_tokens > 0   && <span>Cache↑: {formatTokens(m.cache_read_tokens)}</span>}
                    {m.cache_creation_tokens > 0 && <span>Cache↓: {formatTokens(m.cache_creation_tokens)}</span>}
                    {m.pricing?.input && (
                      <span className="ml-auto text-gray-300 dark:text-slate-600">
                        ${m.pricing.input}/MTok in · ${m.pricing.output}/MTok out
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* By agent */}
        <Card>
          <CardHeader>
            <CardTitle>By Agent</CardTitle>
            <span className="text-xs text-gray-400 dark:text-slate-500">{byAgent.length} agent{byAgent.length !== 1 ? 's' : ''}</span>
          </CardHeader>
          <CardBody>
            {isLoading && <p className="text-sm text-gray-400 dark:text-slate-500">Loading…</p>}
            {!isLoading && byAgent.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">No data for this period</p>
            )}
            {byAgent.length > 0 && (
              <>
                <div className="divide-y divide-gray-50 dark:divide-slate-800">
                  {byAgent.slice(agentOffset, agentOffset + AGENT_PAGE_SIZE).map((a: any) => (
                    <div key={a.agent_type}>
                      <BarRow
                        label={a.agent_type}
                        pct={a.pct}
                        cost={a.cost_usd}
                        calls={a.calls}
                        colour={AGENT_COLOURS[a.agent_type] ?? 'bg-gray-400'}
                      />
                      <div className="flex gap-4 pb-2 pl-[150px] text-[10px] text-gray-400 dark:text-slate-500">
                        <span>In: {formatTokens(a.input_tokens)}</span>
                        <span>Out: {formatTokens(a.output_tokens)}</span>
                        <span className="ml-auto">avg {formatCost(a.avg_cost)}/call</span>
                      </div>
                    </div>
                  ))}
                </div>

                {byAgent.length > AGENT_PAGE_SIZE && (
                  <div className="flex items-center justify-center gap-2 pt-3 border-t border-gray-50 dark:border-slate-800 mt-2">
                    <button
                      onClick={() => setAgentOffset(o => Math.max(0, o - 1))}
                      disabled={agentOffset === 0}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                        agentOffset > 0
                          ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:bg-slate-600'
                          : 'bg-gray-50 dark:bg-slate-950 text-gray-300 dark:text-slate-600 cursor-not-allowed',
                      )}
                    >
                      <ChevronUp size={13} />
                    </button>
                    <span className="text-xs text-gray-400 dark:text-slate-500 tabular-nums">
                      {agentOffset + 1}–{Math.min(agentOffset + AGENT_PAGE_SIZE, byAgent.length)} of {byAgent.length}
                    </span>
                    <button
                      onClick={() => setAgentOffset(o => Math.min(byAgent.length - AGENT_PAGE_SIZE, o + 1))}
                      disabled={agentOffset + AGENT_PAGE_SIZE >= byAgent.length}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                        agentOffset + AGENT_PAGE_SIZE < byAgent.length
                          ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:bg-slate-600'
                          : 'bg-gray-50 dark:bg-slate-950 text-gray-300 dark:text-slate-600 cursor-not-allowed',
                      )}
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

      </div>

      {/* External services */}
      <Card>
        <CardHeader>
          <CardTitle>External Services</CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-500">Credit balances &amp; usage</span>
        </CardHeader>
        <CardBody>
          {external.length === 0 && !isLoading && (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No external services configured</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            {external.map((svc: any) => (
              <ExternalServiceCard key={svc.name} svc={svc} />
            ))}
          </div>
        </CardBody>
      </Card>

      </> /* end overview tab */}

      {tab === 'analysis' && <>

      {/* Trend + Token breakdown */}
      <div className="grid grid-cols-[2fr_1fr] gap-5 mb-5">

        {/* Daily trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Spend</CardTitle>
            <span className="text-xs text-gray-400 dark:text-slate-500">Last 30 days</span>
          </CardHeader>
          <CardBody>
            {isLoading
              ? <p className="text-sm text-gray-400 dark:text-slate-500">Loading…</p>
              : <DailyTrendChart data={trend} />
            }
            {trend.length > 0 && (
              <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mt-3 pt-3 border-t border-gray-50 dark:border-slate-800">
                <span>{trend[0]?.date}</span>
                <span className="font-medium text-gray-600 dark:text-slate-400">
                  Peak: {formatCost(Math.max(...trend.map((d: any) => d.cost_usd)))}
                </span>
                <span>{trend[trend.length - 1]?.date}</span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Token breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Token Breakdown</CardTitle>
            <BarChart2 size={14} className="text-gray-400 dark:text-slate-500" />
          </CardHeader>
          <CardBody>
            {isLoading
              ? <p className="text-sm text-gray-400 dark:text-slate-500">Loading…</p>
              : <TokenBreakdown tokens={tokens} />
            }
          </CardBody>
        </Card>

      </div>

      </> /* end analysis tab */}

    </div>
  )
}
