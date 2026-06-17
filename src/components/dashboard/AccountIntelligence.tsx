'use client'

import { useState } from 'react'
import { Building2, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CardShell, Skel, Divider, DistBar, StagePill, IconTile,
  SLOTS, VERT,
  type CompanyGroup, type UngroupedLead,
} from './shared'

// Dot colour per vertical — matches ActivityFeedCard pattern
const VERT_DOT: Record<string, string> = {
  casino:   '#8b5cf6',
  transit:  '#3b82f6',
  airport:  '#0ea5e9',
  hospital: '#ec4899',
  mall:     '#f59e0b',
}

interface Props {
  groups:    CompanyGroup[]
  ungrouped: UngroupedLead[]
  loading:   boolean
}

export function AccountIntelligence({ groups, ungrouped, loading }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const totalForBar = groups.reduce((s, g) => s + g.count, 0) || 1

  return (
    <CardShell className="px-6 pt-6 pb-5 flex flex-col">
      {/* Header */}
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Account Intelligence</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
        {loading
          ? <Skel className="inline-block h-3 w-52" />
          : `${groups.length} brand groups · ${ungrouped.length} independent`
        }
      </p>

      {/* Distribution bar */}
      {loading
        ? <Skel className="h-2 w-full rounded-full mb-5" />
        : groups.length > 0 && (
          <DistBar segments={groups.map((g, i) => ({
            pct: Math.round(g.count / totalForBar * 100),
            bar: SLOTS[i % SLOTS.length].bar,
          }))} />
        )
      }

      {/*
        maxHeight mirrors VerticalCoverage's content area (264px) so both cards
        are always the same total height regardless of content volume.
      */}
      <div
        className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ maxHeight: '264px' }}
      >
        {/* Loading skeletons */}
        {loading && [0, 1, 2, 3].map(i => (
          <div key={i}>
            <div className="flex items-center gap-3 py-3">
              <Skel className="w-8 h-8 rounded-xl" />
              <Skel className="flex-1 h-4" />
              <Skel className="w-8 h-4" />
            </div>
            {i < 3 && <Divider />}
          </div>
        ))}

        {/* Brand groups — expandable rows with icon tiles */}
        {!loading && groups.map((g, i) => {
          const slot   = SLOTS[i % SLOTS.length]
          const isOpen = expanded === g.parent
          const shown  = g.properties.slice(0, 6)
          return (
            <div key={g.parent}>
              <div
                className="flex items-center gap-3 py-3 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : g.parent)}
              >
                <IconTile tile={slot.tile} Icon={Building2} iconCls={slot.icon} />
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate min-w-0">{g.parent}</span>
                {g.sql_count > 0 && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                    {g.sql_count} SQL
                  </span>
                )}
                <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
                  {g.count}
                </span>
                <span className="text-slate-300 dark:text-neutral-600 shrink-0">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </div>

              {/* Expanded properties */}
              {isOpen && shown.map((p, pi) => (
                <div key={p.id}>
                  <div className="flex items-center gap-3 py-2.5 ml-11">
                    {/* dot — same pattern as ActivityFeedCard */}
                    <span className={cn('w-2 h-2 rounded-full shrink-0', slot.bar)} />
                    <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.city && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline truncate max-w-[72px]">
                          {p.city}
                        </span>
                      )}
                      <StagePill stage={p.stage} />
                    </div>
                  </div>
                  {pi < shown.length - 1 && <Divider ml="ml-16" />}
                </div>
              ))}

              {i < groups.length - 1 && <Divider />}
            </div>
          )
        })}

        {/* Independent / ungrouped — dot style, no section label */}
        {!loading && ungrouped.map((lead, i) => {
          const dotColor = VERT_DOT[lead.vertical ?? ''] ?? '#94a3b8'
          const isLast   = i === ungrouped.length - 1
          return (
            <div key={lead.id}>
              {/* divider above first ungrouped item if there are groups above */}
              {i === 0 && groups.length > 0 && <Divider />}
              <div className="flex items-center gap-3 py-3">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white truncate">
                  {lead.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.city && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">{lead.city}</span>
                  )}
                  <StagePill stage={lead.stage} />
                </div>
              </div>
              {!isLast && <Divider ml="ml-5" />}
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}
