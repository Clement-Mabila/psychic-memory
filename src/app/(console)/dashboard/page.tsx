'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Plus, Zap, Atom, BrainCog, Archive, Cog,
  Users, Contact, FolderClock, AudioLines,
} from 'lucide-react'
import api, { securityApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  StatInline, getDateLabel,
  AccountIntelligence, AIAgents,
  GeographicCoverage, DataQuality,
  RecentLeadsTable, SignalPills,
  type InvestorData, type MarketSignal,
} from '@/components/dashboard'

/* ── Quick actions ───────────────────────────────────────────────────────── */
const ADMIN_QUICK_ACTIONS = [
  { Icon: Plus,     label: 'New Lead',     href: '/leads'                                          },
  { Icon: Zap,      label: 'Run Pipeline', href: '/leads',       dot: 'bg-violet-400'              },
  { Icon: Atom,     label: 'Agent Logs',   href: '/agents/logs', dot: 'bg-emerald-400', pulse: true },
  { Icon: BrainCog, label: 'Intelligence', href: '/training'                                       },
  { Icon: Archive,  label: 'Vault',        href: '/vault',       dot: 'bg-blue-400'                },
  { Icon: Cog,      label: 'Settings',     href: '/settings'                                       },
]

const SALES_QUICK_ACTIONS = [
  { Icon: Plus,        label: 'Add Lead',      href: '/leads'    },
  { Icon: Users,       label: 'My Leads',      href: '/leads'    },
  { Icon: Contact,     label: 'Contacts',      href: '/contacts' },
  { Icon: FolderClock, label: 'Tickets',       href: '/tickets'  },
  { Icon: AudioLines,  label: 'AI Chat',        href: '/ai'       },
]

const SALES_ROLES = ['sales_rep']

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: me } = useQuery({
    queryKey: ['security-me'],
    queryFn:  securityApi.getMe,
    staleTime: 300_000,
  })

  const isSalesRep = SALES_ROLES.includes(me?.role ?? '')

  const { data, isLoading } = useQuery<InvestorData>({
    queryKey: ['investor-overview'],
    queryFn:  () => api.get('/dashboard/investor').then(r => r.data),
    staleTime: 60_000,
  })

  const p           = data?.pipeline
  const vault       = data?.vault
  const costs       = data?.costs
  const agentStats  = data?.agent_stats       ?? []
  const geo         = data?.geography         ?? []
  const verts       = data?.verticals         ?? []
  const funnel      = data?.funnel            ?? []
  const companyData = data?.company_data

  const quickActions = isSalesRep ? SALES_QUICK_ACTIONS : ADMIN_QUICK_ACTIONS

  const { data: signalsData, isLoading: signalsLoading } = useQuery<{ signals: MarketSignal[] }>({
    queryKey: ['market-signals'],
    queryFn:  () => api.get('/leads/signals', { params: { limit: 30 } }).then(r => r.data),
    staleTime: 300_000,
  })
  const signals = signalsData?.signals ?? []

  return (
    <div className="space-y-6 px-6 py-8">

      {/* ── Hero band ───────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="lg:min-w-[240px]">
          <p className="text-xs font-light text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
            {getDateLabel()}
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 mt-2">
            {isSalesRep ? 'My Pipeline' : 'Intelligence Overview'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isSalesRep
              ? 'Your active leads and pipeline at a glance.'
              : 'AI-powered B2B pipeline across North American verticals.'}
          </p>
        </div>

        <div className="flex flex-1 items-center gap-4">
          <div className="flex flex-wrap gap-4">
            {isSalesRep ? (
              <>
                <StatInline
                  label="Active Leads"
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
                  label="Contacts"
                  value={vault ? vault.identities.toLocaleString() : 0}
                  badge={vault ? `${vault.email_pct}% email` : '…'}
                  variant="violet"
                  loading={isLoading}
                />
                <StatInline
                  label="Avg Score"
                  value={p ? Math.round(p.avg_qual_score) : 0}
                  badge="/100"
                  variant="warning"
                  loading={isLoading}
                />
                <StatInline
                  label="Cost per Lead"
                  value={costs ? (costs.cost_per_sql > 0 ? `$${costs.cost_per_sql.toFixed(2)}` : '$0') : 0}
                  badge={costs ? `$${costs.total_usd.toFixed(2)} total` : '…'}
                  variant="muted"
                  loading={isLoading}
                />
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div className={cn(
        'grid grid-cols-2 sm:grid-cols-3 gap-3',
        isSalesRep ? 'lg:grid-cols-5' : 'lg:grid-cols-6',
      )}>
        {quickActions.map(({ Icon, label, href, dot, pulse }: any) => (
          <Link
            key={href + label}
            href={href}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 px-4 py-3 text-center hover:bg-stone-50 dark:hover:bg-neutral-800 hover:border-stone-300 dark:hover:border-neutral-600 transition-all duration-200 group"
          >
            <span className="relative flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 dark:bg-neutral-800 group-hover:bg-stone-200 dark:group-hover:bg-neutral-700 transition-colors">
              <Icon size={18} strokeWidth={1.5} className="text-slate-600 dark:text-slate-300" />
              {dot && (
                <span className={cn(
                  'absolute top-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900',
                  dot, pulse && 'animate-pulse',
                )} />
              )}
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Market signal pills ───────────────────────────────────────── */}
      <SignalPills signals={signals} loading={signalsLoading} />

      {/* ── Main content ──────────────────────────────────────────────── */}
      {isSalesRep ? (
        /* Sales rep: Recent Leads table (left) + Geographic Coverage (right) */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          <div className="lg:col-span-3">
            <RecentLeadsTable />
          </div>
          <div className="lg:col-span-2">
            <GeographicCoverage geo={geo} loading={isLoading} />
          </div>
        </div>
      ) : (
        /* Admin: spotlight + geo top, then three-column bottom */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
            <div className="lg:col-span-3">
              <RecentLeadsTable />
            </div>
            <div className="lg:col-span-2">
              <GeographicCoverage geo={geo} loading={isLoading} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <AIAgents agentStats={agentStats} loading={isLoading} />
            <AccountIntelligence />
            <DataQuality vault={vault} companyData={companyData} loading={isLoading} />
          </div>
        </>
      )}

    </div>
  )
}
