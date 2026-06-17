'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Plus, Zap, Atom, BrainCog, Archive, Cog,
} from 'lucide-react'
import api from '@/lib/api'
import {
  StatInline, getDateLabel,
  AccountIntelligence, VerticalCoverage,
  AIAgents, GeographicCoverage,
  PipelineFunnel, DataQuality,
  type InvestorData,
} from '@/components/dashboard'

/* ── Quick actions ───────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { Icon: Plus,     label: 'New Lead',       href: '/leads'       },
  { Icon: Zap,      label: 'Run Pipeline',   href: '/leads'       },
  { Icon: Atom,     label: 'Agent Logs',     href: '/agents/logs' },
  { Icon: BrainCog, label: 'Intelligence',   href: '/training'    },
  { Icon: Archive,  label: 'Vault',          href: '/vault'       },
  { Icon: Cog,      label: 'Settings',       href: '/settings'    },
]

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data, isLoading } = useQuery<InvestorData>({
    queryKey: ['investor-overview'],
    queryFn:  () => api.get('/dashboard/investor').then(r => r.data),
    staleTime: 60_000,
  })

  const p           = data?.pipeline
  const vault       = data?.vault
  const costs       = data?.costs
  const groups      = data?.company_groups    ?? []
  const ungrouped   = data?.ungrouped_leads   ?? []
  const agentStats  = data?.agent_stats       ?? []
  const geo         = data?.geography         ?? []
  const verts       = data?.verticals         ?? []
  const funnel      = data?.funnel            ?? []
  const companyData = data?.company_data

  return (
    <div className="space-y-6 px-6 py-8">

      {/* ── Hero band ───────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="lg:min-w-[240px]">
          <p className="text-xs font-light text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
            {getDateLabel()}
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 mt-2">
            Intelligence Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-powered B2B pipeline across North American verticals.
          </p>
        </div>

        <div className="flex flex-1 items-center gap-4">
          <div className="flex flex-wrap gap-4">
            <StatInline
              label="Companies tracked"
              value={p ? p.total_companies.toLocaleString() : 0}
              badge={p ? `${p.score_dist.high} high-conf` : '…'}
              variant="blue"
              loading={isLoading}
            />
            <StatInline
              label="SQL-Ready"
              value={p ? p.sql_ready : 0}
              badge={p && p.total_companies ? `${Math.round(p.sql_ready / p.total_companies * 100)}% rate` : '…'}
              variant="success"
              loading={isLoading}
            />
            <StatInline
              label="Vault Identities"
              value={vault ? vault.identities.toLocaleString() : 0}
              badge={vault ? `${vault.email_pct}% email` : '…'}
              variant="violet"
              loading={isLoading}
            />
            <StatInline
              label="Avg Qual Score"
              value={p ? Math.round(p.avg_qual_score) : 0}
              badge="/100"
              variant="warning"
              loading={isLoading}
            />
            <StatInline
              label="Cost per SQL"
              value={costs ? (costs.cost_per_sql > 0 ? `$${costs.cost_per_sql.toFixed(2)}` : '$0') : 0}
              badge={costs ? `$${costs.total_usd.toFixed(2)} total` : '…'}
              variant="muted"
              loading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* ── Quick actions — matches Checklist grid-cols-6 ────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_ACTIONS.map(({ Icon, label, href }) => (
          <Link
            key={href + label}
            href={href}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 px-4 py-3 text-center hover:bg-stone-50 dark:hover:bg-neutral-800 hover:border-stone-300 dark:hover:border-neutral-600 transition-all duration-200 group"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 dark:bg-neutral-800 group-hover:bg-stone-200 dark:group-hover:bg-neutral-700 transition-colors">
              <Icon size={18} strokeWidth={1.5} className="text-slate-600 dark:text-slate-300" />
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Row 1: col-span-5 → [AI Agents + Account Intelligence (3/5)] + [Vertical Coverage (2/5)] */}
      {/* Mirrors Checklist: col-span-3 inner grid-cols-2 + col-span-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AIAgents agentStats={agentStats} loading={isLoading} />
          <AccountIntelligence groups={groups} ungrouped={ungrouped} loading={isLoading} />
        </div>
        <div className="lg:col-span-2 h-full">
          <VerticalCoverage verticals={verts} loading={isLoading} />
        </div>
      </div>

      {/* ── Row 2: 3 equal columns ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <PipelineFunnel funnel={funnel} loading={isLoading} />
        <GeographicCoverage geo={geo} loading={isLoading} />
        <DataQuality vault={vault} companyData={companyData} loading={isLoading} />
      </div>

    </div>
  )
}
