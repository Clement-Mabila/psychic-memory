// Shared types, constants, and atoms for the investor dashboard

import type { LucideIcon } from 'lucide-react'
import {
  Building2, Zap, CheckCircle, TrendingUp, AlertTriangle,
  Train, Plane, Heart, ShoppingBag, Search,
  BookOpen, Sparkles, BarChart2, Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface Property {
  id: string; name: string; city: string; country: string
  stage: string; score: number | null; tier: string
}

export interface CompanyGroup {
  parent: string; count: number; sql_count: number; avg_score: number
  properties: Property[]
}

export interface UngroupedLead {
  id: string; name: string; city: string; country: string
  stage: string; score: number | null; vertical: string
}

export interface AgentStat {
  agent_type: string; total_runs: number; success_count: number
  performance_pct: number; cost_usd: number; action_label: string
}

export interface InvestorData {
  pipeline: {
    total_companies: number; sql_ready: number; avg_qual_score: number
    score_dist: { high: number; mid: number; low: number; unscored: number }
  }
  funnel:   { stage: string; label: string; count: number }[]
  verticals: { vertical: string; count: number; sql_count: number; avg_score: number | null }[]
  geography: {
    hq_city: string; hq_country: string
    company_count: number; sql_count: number
    primary_vertical?: string | null
    has_group_parent: boolean
    companies: {
      id: string; name: string; domain: string
      summary: string; is_group_parent: boolean
      group_name: string | null; stage: string
      score: number | null
    }[]
  }[]
  company_groups:  CompanyGroup[]
  ungrouped_leads: UngroupedLead[]
  agent_stats:     AgentStat[]
  costs: {
    total_usd: number; total_calls: number; cost_per_sql: number
    by_agent: { agent: string; cost_usd: number; calls: number; pct: number }[]
  }
  vault: {
    identities: number; companies: number
    emails: number; phones: number; linkedin: number
    email_pct: number; phone_pct: number; linkedin_pct: number
  }
  company_data: {
    total: number
    city_pct: number;      city_count: number
    employees_pct: number; employees_count: number
    revenue_pct: number;   revenue_count: number
    apollo_pct: number;    apollo_count: number
  }
}

/* ── Colour palettes ────────────────────────────────────────────────────────── */

export const BADGE: Record<string, string> = {
  blue:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  violet:  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  muted:   'bg-stone-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400',
}

export const SLOTS = [
  { tile: 'bg-blue-500/10',    icon: 'text-blue-500',    bar: 'bg-blue-500'    },
  { tile: 'bg-violet-400/10',  icon: 'text-violet-400',  bar: 'bg-violet-400'  },
  { tile: 'bg-emerald-500/10', icon: 'text-emerald-500', bar: 'bg-emerald-500' },
  { tile: 'bg-amber-500/10',   icon: 'text-amber-500',   bar: 'bg-amber-500'   },
  { tile: 'bg-pink-500/10',    icon: 'text-pink-500',    bar: 'bg-pink-500'    },
  { tile: 'bg-sky-500/10',     icon: 'text-sky-500',     bar: 'bg-sky-500'     },
  { tile: 'bg-purple-500/10',  icon: 'text-purple-500',  bar: 'bg-purple-500'  },
  { tile: 'bg-teal-500/10',    icon: 'text-teal-500',    bar: 'bg-teal-500'    },
]

export const VERT: Record<string, {
  tile: string; iconCls: string; bar: string; label: string; Icon: LucideIcon
}> = {
  casino:   { tile: 'bg-violet-600/10', iconCls: 'text-violet-600 dark:text-violet-400', bar: 'bg-violet-500', label: 'Casino & Gaming',  Icon: Building2   },
  transit:  { tile: 'bg-blue-600/10',   iconCls: 'text-blue-600 dark:text-blue-400',     bar: 'bg-blue-500',   label: 'Transit',          Icon: Train       },
  airport:  { tile: 'bg-sky-500/10',    iconCls: 'text-sky-500',                         bar: 'bg-sky-500',    label: 'Airport',          Icon: Plane       },
  hospital: { tile: 'bg-pink-500/10',   iconCls: 'text-pink-500',                        bar: 'bg-pink-500',   label: 'Healthcare',       Icon: Heart       },
  mall:     { tile: 'bg-amber-500/10',  iconCls: 'text-amber-500',                       bar: 'bg-amber-500',  label: 'Retail & Malls',   Icon: ShoppingBag },
}

export const STAGE_CONFIG: Record<string, {
  tile: string; iconCls: string; bar: string; Icon: LucideIcon
}> = {
  sql:           { tile: 'bg-emerald-500/10', iconCls: 'text-emerald-500', bar: 'bg-emerald-500', Icon: CheckCircle    },
  mql:           { tile: 'bg-blue-500/10',    iconCls: 'text-blue-500',    bar: 'bg-blue-500',    Icon: TrendingUp     },
  qualification: { tile: 'bg-violet-400/10',  iconCls: 'text-violet-400',  bar: 'bg-violet-400',  Icon: BarChart2      },
  enrichment:    { tile: 'bg-amber-500/10',   iconCls: 'text-amber-500',   bar: 'bg-amber-500',   Icon: Sparkles       },
  research:      { tile: 'bg-sky-500/10',     iconCls: 'text-sky-500',     bar: 'bg-sky-500',     Icon: BookOpen       },
  contact:       { tile: 'bg-indigo-500/10',  iconCls: 'text-indigo-500',  bar: 'bg-indigo-500',  Icon: Mail           },
  discovery:     { tile: 'bg-slate-400/10',   iconCls: 'text-slate-500',   bar: 'bg-slate-400',   Icon: Search         },
  raw_signal:    { tile: 'bg-slate-300/10',   iconCls: 'text-slate-400',   bar: 'bg-slate-300 dark:bg-slate-600', Icon: Zap },
  needs_review:  { tile: 'bg-orange-500/10',  iconCls: 'text-orange-500',  bar: 'bg-orange-500',  Icon: AlertTriangle  },
}

export const STAGE_PILL: Record<string, { bg: string; text: string; label: string }> = {
  sql:           { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'SQL'      },
  mql:           { bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400',       label: 'MQL'      },
  qualification: { bg: 'bg-violet-400/10',  text: 'text-violet-500 dark:text-violet-400',   label: 'Qualify'  },
  enrichment:    { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',     label: 'Enrich'   },
  research:      { bg: 'bg-sky-500/10',     text: 'text-sky-600 dark:text-sky-400',         label: 'Research' },
  contact:       { bg: 'bg-indigo-500/10',  text: 'text-indigo-600 dark:text-indigo-400',   label: 'Contact'  },
  discovery:     { bg: 'bg-slate-400/10',   text: 'text-slate-500 dark:text-slate-400',     label: 'Discover' },
  raw_signal:    { bg: 'bg-slate-300/10',   text: 'text-slate-400 dark:text-slate-500',     label: 'Signal'   },
  needs_review:  { bg: 'bg-orange-500/10',  text: 'text-orange-600 dark:text-orange-400',   label: 'Review'   },
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

export function getDateLabel() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase()
}

export function flag(code: string) {
  const F: Record<string, string> = { CA: '🇨🇦', US: '🇺🇸', GB: '🇬🇧', AU: '🇦🇺' }
  return F[(code ?? '').toUpperCase()] ?? '🌐'
}

// Pink replaces red for low scores (per design direction)
export function scoreColor(s: number | null) {
  if (s == null) return 'text-slate-400 dark:text-slate-500 font-normal'
  if (s >= 70)   return 'text-emerald-500 dark:text-emerald-400 font-normal'
  if (s >= 40)   return 'text-amber-500 dark:text-amber-400 font-normal'
  return 'text-pink-500 dark:text-pink-400 font-normal'
}

/* ── Atoms ──────────────────────────────────────────────────────────────────── */

export function StatInline({
  label, value, badge, variant, loading,
}: {
  label: string; value: string | number; badge: string
  variant: keyof typeof BADGE; loading: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-stone-50 dark:bg-neutral-800/60 rounded-3xl px-5 py-4 min-w-[130px]">
      <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2 flex-wrap">
        {loading
          ? <div className="h-7 w-16 bg-stone-200 dark:bg-neutral-700 rounded animate-pulse" />
          : <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{value}</span>
        }
        {!loading && (
          <span className={cn('text-xs font-normal px-2 py-1 rounded-2xl whitespace-nowrap', BADGE[variant])}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}

export function StagePill({ stage }: { stage: string }) {
  const s = STAGE_PILL[stage] ?? { bg: 'bg-slate-100 dark:bg-neutral-800', text: 'text-slate-500 dark:text-slate-400', label: stage }
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', s.bg, s.text)}>
      {s.label}
    </span>
  )
}

export function IconTile({ tile, Icon, iconCls }: { tile: string; Icon: LucideIcon; iconCls: string }) {
  return (
    <span className={cn('flex items-center justify-center w-8 h-8 rounded-xl shrink-0', tile)}>
      <Icon size={15} strokeWidth={1.5} className={iconCls} />
    </span>
  )
}

export function Divider({ ml = 'ml-11' }: { ml?: string }) {
  return <div className={cn('h-px bg-gray-100 dark:bg-neutral-800', ml)} />
}

export function Skel({ className }: { className?: string }) {
  return <span className={cn('bg-stone-100 dark:bg-neutral-800 rounded animate-pulse', className)} />
}

export function DistBar({ segments }: { segments: { pct: number; bar: string }[] }) {
  return (
    <div className="flex gap-1 mb-5">
      {segments.map((s, i) =>
        s.pct > 0 ? (
          <div key={i} className={cn('h-2 rounded-full transition-all duration-500', s.bar)}
            style={{ width: `${s.pct}%` }} />
        ) : null
      )}
    </div>
  )
}

export function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800',
      className,
    )}>
      {children}
    </div>
  )
}
