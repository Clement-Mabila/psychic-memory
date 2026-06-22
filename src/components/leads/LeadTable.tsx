'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Play, RotateCcw, MapPin, Calendar, Globe, Info, Circle, Octagon, Pentagon, Squircle, Aperture, Atom, Building2 } from 'lucide-react'
import { STAGE_COLOURS, VERTICAL_COLOURS, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const RERUN_OPTIONS = [
  { value: 'research',      label: 'Re-run from Research' },
  { value: 'contact',       label: 'Re-run from Contact' },
  { value: 'enrichment',    label: 'Re-run from Enrichment' },
  { value: 'qualification', label: 'Re-run Qualification only' },
]

const RUN_ONLY_OPTIONS: { value: string; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'research',      label: 'Research only',      icon: Aperture,  color: 'text-purple-500'  },
  { value: 'contact',       label: 'Contact only',       icon: Aperture,  color: 'text-pink-500'    },
  { value: 'enrichment',    label: 'Enrichment only',    icon: Circle,    color: 'text-orange-500'  },
  { value: 'qualification', label: 'Qualification only', icon: Squircle,  color: 'text-emerald-500 dark:text-emerald-400' },
]

const AVATAR_COLOURS = [
  'bg-indigo-600 text-white',
  'bg-purple-600 text-white',
  'bg-sky-600 text-white',
  'bg-pink-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-600 text-white',
  'bg-red-600 text-white',
  'bg-cyan-600 text-white',
  'bg-violet-600 text-white',
  'bg-fuchsia-600 text-white',
  'bg-pink-600 text-white',
  'bg-gray-500 text-white',
]

function CompanyAvatar({ name }: { name: string }) {
  const colour = AVATAR_COLOURS[name.charCodeAt(0) % AVATAR_COLOURS.length]
  return (
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0', colour)}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

function ActionsMenu({ lead, onRun, onRerun, onRunOnly, onSetGroup }: { lead: any; onRun: (id: string) => void; onRerun: (id: string, from: string) => void; onRunOnly: (id: string, agentType: string) => void; onSetGroup?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-lg p-1">
          <button
            onClick={() => { onRun(lead.id); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Play className="h-3 w-3" /> Run pipeline
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-neutral-800" />
          {RERUN_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => { onRerun(lead.id, o.value); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> {o.label}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100 dark:border-neutral-800" />
          <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Run only</p>
          {RUN_ONLY_OPTIONS.map(o => {
            const Icon = o.icon
            return (
              <button
                key={o.value}
                onClick={() => { onRunOnly(lead.id, o.value); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon className={cn('h-3 w-3 flex-shrink-0', o.color)} strokeWidth={1.75} /> {o.label}
              </button>
            )
          })}
          {onSetGroup && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-neutral-800" />
              <button
                onClick={() => { onSetGroup(lead.id); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Building2 className="h-3 w-3 flex-shrink-0 text-indigo-400" /> Set Group
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Column header ─────────────────────────────────────────────────────────────
const HEADERS: { label: string; info?: boolean }[] = [
  { label: 'Company' },
  { label: 'Domain',   info: true },
  { label: 'Vertical' },
  { label: 'Stage' },
  { label: 'Score' },
  { label: 'Priority' },
  { label: 'Location' },
  { label: 'Group' },
  { label: 'Modified', info: true },
  { label: '' },
]

interface LeadTableProps {
  leads: any[]
  isLoading: boolean
  selected: Set<string>
  onToggleAll: (checked: boolean) => void
  onToggleSelect: (id: string) => void
  runStatus: Record<string, string>
  isRunning: (id: string) => boolean
  onRun: (id: string) => void
  onRerun: (id: string, from: string) => void
  onRunOnly: (id: string, agentType: string) => void
  onOpen?: (id: string) => void
  onSetGroup?: (id: string) => void
}

export default function LeadTable({ leads, isLoading, selected, onToggleAll, onToggleSelect, onRun, onRerun, onRunOnly, onOpen, onSetGroup }: LeadTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 dark:bg-neutral-800 border-b border-slate-200 dark:border-neutral-700">
            <th className="w-10 px-4 py-4">
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === leads.length}
                onChange={e => onToggleAll(e.target.checked)}
                className="cursor-pointer"
              />
            </th>
            {HEADERS.map(h => (
              <th key={h.label} className="px-4 py-4 text-left text-sm font-medium text-black dark:text-slate-100 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  {h.label}
                  {h.info && <Info className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">Loading…</td>
            </tr>
          )}

          {leads.map(lead => {
            const location = [lead.hq_city, lead.hq_state, lead.hq_country].filter(Boolean).join(', ')

            return (
              <tr
                key={lead.id}
                onClick={() => onOpen?.(lead.id)}
                className={cn(
                  'border-b border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                  selected.has(lead.id) && 'bg-indigo-50 dark:bg-indigo-950/40',
                  onOpen && 'cursor-pointer'
                )}
              >
                {/* Checkbox */}
                <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => onToggleSelect(lead.id)} className="cursor-pointer" />
                </td>

                {/* Company */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2.5">
                    <CompanyAvatar name={lead.company_name} />
                    <span className="text-sm font-medium text-black dark:text-slate-100 truncate max-w-[160px]">{lead.company_name}</span>
                  </div>
                </td>

                {/* Domain */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Globe className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <span className="truncate max-w-[160px]">{lead.domain ?? '—'}</span>
                  </div>
                </td>

                {/* Vertical */}
                <td className="px-4 py-4">
                  {lead.vertical ? (
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', VERTICAL_COLOURS[lead.vertical] ?? 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400')}>
                      {lead.vertical.charAt(0).toUpperCase() + lead.vertical.slice(1)}
                    </span>
                  ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>

                {/* Stage */}
                <td className="px-4 py-4">
                  {lead.lifecycle_stage ? (
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', STAGE_COLOURS[lead.lifecycle_stage] ?? 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400')}>
                      {lead.lifecycle_stage.replace(/_/g, ' ')}
                    </span>
                  ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>

                {/* Score */}
                <td className="px-4 py-4 text-sm text-black dark:text-slate-100">
                  {lead.qualification_score ?? 0}
                </td>

                {/* Priority */}
                <td className="px-4 py-4 text-sm text-black dark:text-slate-100">
                  {lead.priority_tier
                    ? lead.priority_tier.charAt(0) + lead.priority_tier.slice(1).toLowerCase()
                    : 'Standard'}
                </td>

                {/* Location */}
                <td className="px-4 py-4">
                  {location ? (
                    <div className="flex items-center gap-1.5 text-sm text-black dark:text-slate-100">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      {location}
                    </div>
                  ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>

                {/* Group */}
                <td className="px-4 py-4">
                  {lead.corporate_group ? (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium truncate max-w-[120px]">
                        {lead.corporate_group.name}
                      </span>
                      {lead.is_group_parent && (
                        <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-400 px-1 rounded">P</span>
                      )}
                    </div>
                  ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>

                {/* Modified */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    {lead.modified ? formatRelativeTime(lead.modified) : '—'}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-2 py-4" onClick={e => e.stopPropagation()}>
                  <ActionsMenu lead={lead} onRun={onRun} onRerun={onRerun} onRunOnly={onRunOnly} onSetGroup={onSetGroup} />
                </td>
              </tr>
            )
          })}

          {!isLoading && leads.length === 0 && (
            <tr>
              <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No leads match your filters</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
