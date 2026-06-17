'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { vaultApi } from '@/lib/api'
import { COLLECTION_DEFS } from './shared/constants'
import {
  Globe, Layers, Users, Database, Phone,
  MoreHorizontal, ChevronRight, Building2, Link2, ShieldCheck,
} from 'lucide-react'

interface VaultLandingProps {
  onSelectCollection: (tier: string) => void
  onOpenCompliance:   () => void
}

const TIER_REGION = {
  actionable: {
    label:    'Actionable',
    barBg:    'bg-cyan-400',
    dotBg:    'bg-cyan-400',
    pillBg:   'bg-cyan-50   dark:bg-cyan-900/30',
    pillText: 'text-cyan-700 dark:text-cyan-300',
  },
  enrichable: {
    label:    'Enrichable',
    barBg:    'bg-pink-400',
    dotBg:    'bg-pink-400',
    pillBg:   'bg-pink-50   dark:bg-pink-900/30',
    pillText: 'text-pink-700 dark:text-pink-300',
  },
  discoverable: {
    label:    'Discoverable',
    barBg:    'bg-stone-400',
    dotBg:    'bg-stone-400',
    pillBg:   'bg-stone-50   dark:bg-zinc-700/60',
    pillText: 'text-stone-700 dark:text-zinc-300',
  },
} as const

// Percentage helper — clamp to 0–100
function pct(n: number, d: number) {
  if (!d) return 0
  return Math.min(Math.round((n / d) * 100), 100)
}

export function VaultLanding({ onSelectCollection, onOpenCompliance }: VaultLandingProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const { data: collections } = useQuery({
    queryKey:        ['vault-identity-collections'],
    queryFn:         vaultApi.getCollections,
    staleTime:       30_000,
    refetchInterval: 60_000,
  })

  const { data: syncData } = useQuery({
    queryKey:        ['vault-sync-status'],
    queryFn:         vaultApi.getSyncStatus,
    staleTime:       15_000,
    refetchInterval: 30_000,
  })

  const total             = (collections as any)?.total             ?? 0
  const companiesTotal    = (collections as any)?.companies_total   ?? 0
  const linkedinTotal     = (collections as any)?.linkedin_total    ?? 0
  const phonesTotal       = (collections as any)?.phones_total      ?? 0
  const complianceRecords = (collections as any)?.compliance_records ?? 0
  const signals           = (syncData   as any)?.total_signals      ?? 0
  const appearances       = (syncData   as any)?.total_appearances  ?? 0

  const tierCounts  = COLLECTION_DEFS.map(def => ({
    ...def,
    count: (collections as any)?.[def.tier] ?? 0,
  }))
  const totalForPct = total || 1
  // Grand total across all distinct dataset types (for bar + tile %)
  const grandTotal  = total + companiesTotal + complianceRecords || 1
  // linkedin + phones are subsets of `total` — use total as denominator for their %

  const containers: string[] = (syncData as any)?.containers ?? []

  const CATEGORIES = [
    { id: null,           label: 'All'          },
    { id: 'actionable',   label: 'Actionable'   },
    { id: 'enrichable',   label: 'Enrichable'   },
    { id: 'discoverable', label: 'Discoverable' },
    { id: 'companies',    label: 'Companies'    },
    { id: 'linkedin',     label: 'LinkedIn'     },
    { id: 'phones',       label: 'Phones'       },
  ]

  const visibleDefs = activeCategory
    ? COLLECTION_DEFS.filter(d => d.tier === activeCategory)
    : COLLECTION_DEFS

  // ── Tile active state helpers ────────────────────────────────────────────
  const tileActive = (key: string) =>
    activeCategory === null || activeCategory === key

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 font-sans">

      {/* ── Status banners ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-white/10 px-5 py-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Globe size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-zinc-300">Public web data</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Layers size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-zinc-300">385+ domains</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-white/10 px-5 py-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Layers size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-zinc-300">475+ datasets</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Users size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-zinc-300">
              {signals.toLocaleString() || '—'} signals indexed
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-white/10 px-5 py-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-zinc-300">GDPR compliant</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Database size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-zinc-300">End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {/* ── Middle: Dataset tiles + Containers ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        {/* Datasets Collections panel — 2/3 */}
        <div className="col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-white/10 px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Datasets Collections</h2>
            <button
              onClick={onOpenCompliance}
              className="text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Segmented bar — all datasets */}
          <div className="flex rounded-full overflow-hidden h-1.5 mb-5 gap-0.5">
            {tierCounts.map((t, i) => (
              <div key={i} className={cn('h-full transition-all duration-500', TIER_REGION[t.tier].barBg)}
                style={{ width: `${pct(t.count, grandTotal)}%` }} />
            ))}
            <div className="h-full bg-indigo-400 transition-all duration-500"
              style={{ width: `${pct(companiesTotal, grandTotal)}%` }} />
            <div className="h-full bg-violet-400 transition-all duration-500"
              style={{ width: `${pct(linkedinTotal,  grandTotal)}%` }} />
            <div className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${pct(phonesTotal,    grandTotal)}%` }} />
            <div className="h-full bg-sky-400 transition-all duration-500"
              style={{ width: `${pct(complianceRecords, grandTotal)}%` }} />
          </div>

          {/* 6-tile grid — 2 cols × 3 rows */}
          <div className="grid grid-cols-2 gap-3">

            {/* Identity tier tiles */}
            {tierCounts.map(def => {
              const reg = TIER_REGION[def.tier]
              const p   = pct(def.count, totalForPct)
              return (
                <button
                  key={def.tier}
                  onClick={() => onSelectCollection(def.tier)}
                  className={cn(
                    'text-left border rounded-xl px-4 py-3 transition-all hover:shadow-sm',
                    tileActive(def.tier)
                      ? 'border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20 bg-white dark:bg-zinc-900'
                      : 'border-slate-50 dark:border-white/5 opacity-40',
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Layers size={16} className="text-stone-500 dark:text-zinc-400 shrink-0 -ml-1" />
                    <span className="text-sm font-normal text-slate-800 dark:text-zinc-200">
                      {reg.label} Datasets
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">
                      {def.count.toLocaleString()}
                    </span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', reg.pillBg, reg.pillText)}>
                      {p}%
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-zinc-500 mt-1 line-clamp-1">
                    {def.description.split('—')[0].trim()}
                  </p>
                </button>
              )
            })}

            {/* Companies tile */}
            <button
              onClick={() => onSelectCollection('companies')}
              className={cn(
                'text-left border rounded-xl px-4 py-3 transition-all hover:shadow-sm',
                tileActive('companies')
                  ? 'border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20 bg-white dark:bg-zinc-900'
                  : 'border-slate-50 dark:border-white/5 opacity-40',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Building2 size={16} className="text-indigo-500 shrink-0 -ml-1" />
                <span className="text-sm font-normal text-slate-800 dark:text-zinc-200">Company Accounts</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {companiesTotal.toLocaleString()}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {pct(companiesTotal, grandTotal)}%
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-500 mt-1 line-clamp-1">
                Firmographic profiles — domain, size, revenue
              </p>
            </button>

            {/* LinkedIn Profiles tile */}
            <button
              onClick={() => onSelectCollection('linkedin')}
              className={cn(
                'text-left border rounded-xl px-4 py-3 transition-all hover:shadow-sm',
                tileActive('linkedin')
                  ? 'border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20 bg-white dark:bg-zinc-900'
                  : 'border-slate-50 dark:border-white/5 opacity-40',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Link2 size={16} className="text-violet-500 shrink-0 -ml-1" />
                <span className="text-sm font-normal text-slate-800 dark:text-zinc-200">LinkedIn Profiles</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {linkedinTotal.toLocaleString()}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {pct(linkedinTotal, totalForPct)}%
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-500 mt-1 line-clamp-1">
                Identities with a verified LinkedIn URL
              </p>
            </button>

            {/* Phone Numbers tile */}
            <button
              onClick={() => onSelectCollection('phones')}
              className={cn(
                'text-left border rounded-xl px-4 py-3 transition-all hover:shadow-sm',
                tileActive('phones')
                  ? 'border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20 bg-white dark:bg-zinc-900'
                  : 'border-slate-50 dark:border-white/5 opacity-40',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Phone size={16} className="text-emerald-500 shrink-0 -ml-1" />
                <span className="text-sm font-normal text-slate-800 dark:text-zinc-200">Phone Numbers</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {phonesTotal.toLocaleString()}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {pct(phonesTotal, totalForPct)}%
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-500 mt-1 line-clamp-1">
                Contacts with a verified direct or mobile number
              </p>
            </button>

            {/* Compliance Vault tile */}
            <button
              onClick={onOpenCompliance}
              className={cn(
                'text-left border rounded-xl px-4 py-3 transition-all hover:shadow-sm col-span-2',
                'border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20 bg-white dark:bg-zinc-900',
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck size={16} className="text-sky-500 shrink-0 -ml-1" />
                    <span className="text-sm font-normal text-slate-800 dark:text-zinc-200">Compliance Vault</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">
                      {complianceRecords.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                      {pct(complianceRecords, grandTotal)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-stone-500 dark:text-zinc-500 max-w-[200px] text-right">
                  Encrypted archive · GDPR/CASL erasure · Retention policies
                </p>
              </div>
            </button>

          </div>
        </div>

        {/* Organisation Datasets panel — 1/3 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-white/10 px-5 py-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Organisation Datasets</h2>
          <div className="flex flex-col gap-2">
            {(containers.length === 0
              ? ['actionable_identities', 'enrichable_identities', 'discoverable_identities', 'company_accounts', 'linkedin_profiles', 'phone_numbers', 'compliance_vault']
              : containers
            ).map(c => (
              <div
                key={c}
                className="flex items-center gap-2.5 bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition-colors rounded-lg px-3 py-2.5 cursor-pointer"
                onClick={() =>
                  c.includes('compliance')
                    ? onOpenCompliance()
                    : c.includes('company')
                    ? onSelectCollection('companies')
                    : c.includes('linkedin')
                    ? onSelectCollection('linkedin')
                    : c.includes('phone')
                    ? onSelectCollection('phones')
                    : onSelectCollection(c.split('_')[0])
                }
              >
                {c.includes('linkedin')
                  ? <Link2    size={16} className="text-violet-500 shrink-0" />
                  : c.includes('company')
                  ? <Building2 size={16} className="text-indigo-500 shrink-0" />
                  : c.includes('phone')
                  ? <Phone    size={16} className="text-emerald-500 shrink-0" />
                  : c.includes('compliance')
                  ? <ShieldCheck size={16} className="text-sky-500 shrink-0" />
                  : <Layers   size={16} className="text-pink-600 shrink-0" />
                }
                <span className="text-xs text-slate-600 dark:text-zinc-400 font-normal truncate">{c}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <p className="text-xs text-slate-500 dark:text-zinc-500">Total identities</p>
            <p className="text-xs font-semibold text-slate-800 dark:text-white mt-0.5">{total.toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
              {companiesTotal.toLocaleString()} companies · {appearances.toLocaleString()} appearances
            </p>
          </div>
        </div>
      </div>

      {/* ── Collections table ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-white/10 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">MBody Datasets Collections</h2>
          <div className="flex items-center gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={String(cat.id)}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-3 py-2 rounded-2xl text-xs font-medium border transition-colors',
                  activeCategory === cat.id
                    ? 'bg-stone-600 border-stone-500 text-white dark:bg-zinc-700 dark:border-zinc-600'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/10">
              {['Collection', 'Tier', 'Signal coverage', 'Records', 'Share of vault'].map(h => (
                <th
                  key={h}
                  className="text-left text-xs font-semibold text-slate-800 dark:text-zinc-400 pb-3 pr-4 last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleDefs.map((def, i) => {
              const count = (collections as any)?.[def.tier] ?? 0
              const p     = pct(count, totalForPct)
              const reg   = TIER_REGION[def.tier]
              return (
                <tr
                  key={def.tier}
                  onClick={() => onSelectCollection(def.tier)}
                  className={cn(
                    'hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer',
                    i < visibleDefs.length - 1 ? 'border-b border-slate-100 dark:border-white/10' : '',
                  )}
                >
                  <td className="py-3.5 pr-4">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-md', reg.pillBg, reg.pillText)}>
                      {def.title}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', reg.dotBg)} />
                      <span className="text-xs text-slate-600 dark:text-zinc-400">
                        {reg.label.charAt(0) + reg.label.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-zinc-500">{def.coverage}</td>
                  <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-zinc-400 tabular-nums">
                    {count.toLocaleString()}
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 max-w-[140px]">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', reg.barBg)}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 w-8 tabular-nums">{p}%</span>
                      <ChevronRight size={12} className="text-slate-300 dark:text-zinc-600" />
                    </div>
                  </td>
                </tr>
              )
            })}

            {/* Companies row */}
            {(activeCategory === null || activeCategory === 'companies') && (
              <tr
                onClick={() => onSelectCollection('companies')}
                className={cn(
                  'hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer',
                  visibleDefs.length > 0 ? 'border-t border-slate-100 dark:border-white/10' : '',
                )}
              >
                <td className="py-3.5 pr-4">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    Company Accounts
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-indigo-400" />
                    <span className="text-xs text-slate-600 dark:text-zinc-400">Accounts</span>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-zinc-500">Domain · Size · Revenue</td>
                <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-zinc-400 tabular-nums">
                  {companiesTotal.toLocaleString()}
                </td>
                <td className="py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 max-w-[140px]">
                      <div
                        className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                        style={{ width: `${pct(companiesTotal, grandTotal)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-zinc-500 w-8 tabular-nums">
                      {pct(companiesTotal, grandTotal)}%
                    </span>
                    <ChevronRight size={12} className="text-slate-300 dark:text-zinc-600" />
                  </div>
                </td>
              </tr>
            )}

            {/* LinkedIn Profiles row */}
            {(activeCategory === null || activeCategory === 'linkedin') && (
              <tr
                onClick={() => onSelectCollection('linkedin')}
                className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer border-t border-slate-100 dark:border-white/10"
              >
                <td className="py-3.5 pr-4">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    LinkedIn Profiles
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-violet-400" />
                    <span className="text-xs text-slate-600 dark:text-zinc-400">Profiles</span>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-zinc-500">Name · LinkedIn · Context</td>
                <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-zinc-400 tabular-nums">
                  {linkedinTotal.toLocaleString()}
                </td>
                <td className="py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 max-w-[140px]">
                      <div className="h-full rounded-full bg-violet-400 transition-all duration-500"
                        style={{ width: `${pct(linkedinTotal, totalForPct)}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-zinc-500 w-8 tabular-nums">
                      {pct(linkedinTotal, totalForPct)}%
                    </span>
                    <ChevronRight size={12} className="text-slate-300 dark:text-zinc-600" />
                  </div>
                </td>
              </tr>
            )}

            {/* Phone Numbers row */}
            {(activeCategory === null || activeCategory === 'phones') && (
              <tr
                onClick={() => onSelectCollection('phones')}
                className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer border-t border-slate-100 dark:border-white/10"
              >
                <td className="py-3.5 pr-4">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Phone Numbers
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400" />
                    <span className="text-xs text-slate-600 dark:text-zinc-400">Direct &amp; Mobile</span>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-zinc-500">Name · Phone · Company</td>
                <td className="py-3.5 pr-4 text-xs text-slate-500 dark:text-zinc-400 tabular-nums">
                  {phonesTotal.toLocaleString()}
                </td>
                <td className="py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 max-w-[140px]">
                      <div className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${pct(phonesTotal, totalForPct)}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-zinc-500 w-8 tabular-nums">
                      {pct(phonesTotal, totalForPct)}%
                    </span>
                    <ChevronRight size={12} className="text-slate-300 dark:text-zinc-600" />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
