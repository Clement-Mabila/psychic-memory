import { AlertTriangle, Check, Shield, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarCard, SidebarRow } from './shared/SidebarCard'
import { countryName, provinceName } from './geo'

const FOUNDER_TITLES = ['ceo', 'chief executive', 'founder', 'co-founder', 'president', 'owner', 'managing director', 'general manager']

function findFounder(contacts: any[]): any | null {
  if (!contacts?.length) return null
  return contacts.find((c: any) => {
    const t = (c.title ?? '').toLowerCase()
    return FOUNDER_TITLES.some(ft => t.includes(ft))
  }) ?? null
}

export function Sidebar({ lead }: { lead: any }) {
  return (
    <div className="flex flex-col gap-3">
      <OrgStatusPanel      lead={lead} />
      <ScoreBreakdownPanel lead={lead} />
      <LocationsPanel      lead={lead} />
      <CompliancePanel     lead={lead} />
      <CorporateGroupPanel lead={lead} />
    </div>
  )
}

function OrgStatusPanel({ lead }: { lead: any }) {
  const founder = findFounder(lead.contacts ?? [])

  return (
    <SidebarCard title="Organisation Status">
      <SidebarRow label="Founded"  value={lead.founded_year ?? '—'} />
      <SidebarRow label="Industry" value={<span className="capitalize">{lead.industry ?? lead.vertical ?? '—'}</span>} />
      <SidebarRow label="Funding"  value={lead.latest_funding_round ?? '—'} />
      <SidebarRow label="Founder"  value={founder?.name ?? '—'} />
    </SidebarCard>
  )
}

function ScoreBreakdownPanel({ lead }: { lead: any }) {
  const segments = [
    { label: 'Firmographic',   value: lead.firmographic_score,   bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { label: 'Buying Signal',  value: lead.buying_signal_score,  bar: 'bg-amber-400',   dot: 'bg-amber-400'  },
    { label: 'Intent',         value: lead.intent_score,         bar: 'bg-blue-500',    dot: 'bg-blue-500'   },
    { label: 'Stakeholder',    value: lead.stakeholder_score,    bar: 'bg-violet-500',  dot: 'bg-violet-500' },
    { label: 'Historical Win', value: lead.historical_win_score, bar: 'bg-slate-300 dark:bg-slate-600',   dot: 'bg-slate-400'  },
  ].filter(s => s.value != null)

  if (!segments.length) return null

  const total = segments.reduce((sum, s) => sum + (s.value ?? 0), 0)

  return (
    <SidebarCard title="Score Breakdown">
      {/* Stacked proportional bar */}
      <div className="flex h-3 gap-0.5 mb-3">
        {segments.map(s => (
          <div
            key={s.label}
            className={cn('rounded-full', s.bar)}
            style={{ width: total > 0 ? `${((s.value ?? 0) / total) * 100}%` : '0%' }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', s.dot)} />
            <span className="text-xs text-slate-600 dark:text-slate-400">{s.label}</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 ml-0.5">{s.value}</span>
          </div>
        ))}
      </div>
    </SidebarCard>
  )
}

function LocationsPanel({ lead }: { lead: any }) {
  if (!lead.hq_city && !lead.hq_state && !lead.hq_country) return null

  const city     = lead.hq_city ?? ''
  const state    = provinceName(lead.hq_state)
  const country  = countryName(lead.hq_country)
  const cityLine = [city, state].filter(Boolean).join(', ')

  return (
    <SidebarCard title="Locations">
      <div className="pt-1">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">HQ Office</p>
        {cityLine && <p className="text-xs text-slate-500 dark:text-slate-400">{cityLine}</p>}
        {country  && <p className="text-xs text-slate-500 dark:text-slate-400">{country}</p>}
      </div>
    </SidebarCard>
  )
}

function CompliancePanel({ lead }: { lead: any }) {
  const hasAny = lead.is_quebec_excluded || lead.casl_compliant || lead.hipaa_baa_required || lead.cross_border_flag
  if (!hasAny) return null
  return (
    <SidebarCard title="Compliance">
      <div className="flex flex-wrap gap-1.5 pt-1">
        {lead.is_quebec_excluded && (
          <span className="flex items-center gap-1 text-[10px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-1 rounded-full border border-red-100 dark:border-red-900/40">
            <AlertTriangle size={9} /> QC excluded
          </span>
        )}
        {lead.casl_compliant && (
          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/40">
            <Check size={9} /> CASL
          </span>
        )}
        {lead.hipaa_baa_required && (
          <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-900/40">
            <Shield size={9} /> HIPAA BAA
          </span>
        )}
        {lead.cross_border_flag && (
          <span className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full border border-blue-100 dark:border-blue-900/40">
            <Globe size={9} /> Cross-border
          </span>
        )}
      </div>
    </SidebarCard>
  )
}

function CorporateGroupPanel({ lead }: { lead: any }) {
  if (!lead.corporate_group) return null
  return (
    <SidebarCard title="Corporate Group">
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {lead.corporate_group.name}
          </span>
          {lead.is_group_parent && (
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-1.5 py-px rounded-full">
              Parent
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lead.corporate_group.member_count} propert{lead.corporate_group.member_count !== 1 ? 'ies' : 'y'}
        </p>
      </div>
    </SidebarCard>
  )
}
