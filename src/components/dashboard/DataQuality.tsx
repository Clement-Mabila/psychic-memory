'use client'

import { Mail, Phone, UserCheck, MapPin, Users, TrendingUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CardShell, Skel, Divider, IconTile, type InvestorData } from './shared'

interface Props {
  vault:       InvestorData['vault']        | undefined
  companyData: InvestorData['company_data'] | undefined
  loading:     boolean
}

interface DataRow {
  label: string; count: number; pct: number
  tile: string; iconCls: string; bar: string; Icon: any
}

function PctBar({ pct, bar }: { pct: number; bar: string }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-16 h-1.5 rounded-full bg-stone-200 dark:bg-neutral-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  )
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-1">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {title}
      </span>
      <div className="h-px flex-1 bg-gray-100 dark:bg-neutral-800" />
    </div>
  )
}

export function DataQuality({ vault, companyData, loading }: Props) {
  const identityRows: DataRow[] = vault ? [
    { label: 'Verified Email',   count: vault.emails,   pct: vault.email_pct,
      tile: 'bg-sky-500/10',     iconCls: 'text-sky-500',     bar: 'bg-sky-500',     Icon: Mail      },
    { label: 'Direct Phone',     count: vault.phones,   pct: vault.phone_pct,
      tile: 'bg-emerald-500/10', iconCls: 'text-emerald-500', bar: 'bg-emerald-500', Icon: Phone     },
    { label: 'LinkedIn Profile', count: vault.linkedin, pct: vault.linkedin_pct,
      tile: 'bg-blue-500/10',    iconCls: 'text-blue-500',    bar: 'bg-blue-500',    Icon: UserCheck },
  ] : []

  const companyRows: DataRow[] = companyData ? [
    { label: 'HQ City set',    count: companyData.city_count,       pct: companyData.city_pct,
      tile: 'bg-violet-500/10',  iconCls: 'text-violet-500',  bar: 'bg-violet-500',  Icon: MapPin    },
    { label: 'Employee count', count: companyData.employees_count,  pct: companyData.employees_pct,
      tile: 'bg-amber-500/10',   iconCls: 'text-amber-500',   bar: 'bg-amber-500',   Icon: Users     },
    { label: 'Revenue range',  count: companyData.revenue_count,    pct: companyData.revenue_pct,
      tile: 'bg-teal-500/10',    iconCls: 'text-teal-500',    bar: 'bg-teal-500',    Icon: TrendingUp },
    { label: 'Apollo linked',  count: companyData.apollo_count,     pct: companyData.apollo_pct,
      tile: 'bg-orange-500/10',  iconCls: 'text-orange-500',  bar: 'bg-orange-500',  Icon: Zap       },
  ] : []

  const allRows = [
    ...(identityRows.length > 0 ? ['_identity' as const, ...identityRows] : []),
    ...(companyRows.length > 0  ? ['_company'  as const, ...companyRows]  : []),
  ]

  return (
    <CardShell className="px-6 pt-6 pb-5 flex flex-col">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Data Quality Index</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
        {loading
          ? <Skel className="h-3 w-44 inline-block" />
          : vault ? `${vault.identities.toLocaleString()} identities · ${vault.companies.toLocaleString()} companies` : '—'
        }
      </p>

      {/* maxHeight: 264px — matches row-2 peers */}
      <div
        className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ maxHeight: '264px' }}
      >
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skel className="w-8 h-8 rounded-xl" />
            <Skel className="flex-1 h-4" />
            <Skel className="w-28 h-4" />
          </div>
        ))}

        {!loading && (() => {
          const elements: React.ReactNode[] = []
          let rowCount = 0

          for (let ii = 0; ii < allRows.length; ii++) {
            const item = allRows[ii]

            if (item === '_identity') {
              elements.push(<SectionLabel key="_id_label" title="Identity Coverage" />)
              continue
            }
            if (item === '_company') {
              elements.push(<SectionLabel key="_co_label" title="Company Completeness" />)
              continue
            }

            const row = item as DataRow
            const isLastInSection = ii === allRows.length - 1
              || allRows[ii + 1] === '_company'
              || allRows[ii + 1] === '_identity'

            elements.push(
              <div key={row.label}>
                <div className="flex items-center gap-3 py-2.5">
                  <IconTile tile={row.tile} Icon={row.Icon} iconCls={row.iconCls} />
                  <span className="flex-1 text-xs text-slate-700 dark:text-slate-300">{row.label}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    {row.count.toLocaleString()}
                  </span>
                  <PctBar pct={row.pct} bar={row.bar} />
                </div>
                {!isLastInSection && <Divider />}
              </div>
            )
            rowCount++
          }

          return elements
        })()}
      </div>
    </CardShell>
  )
}
