'use client'

import { useState } from 'react'
import { Play, RotateCcw, MoreHorizontal, MapPin, Link2, Circle, Octagon, Pentagon, Squircle, Aperture, Atom, Users, MessageSquare, Copy, Check, Phone, PhoneOff, Building2 } from 'lucide-react'
import { STAGE_COLOURS, VERTICAL_COLOURS, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Popover } from '@/components/ui/popover'

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ContactsPopover({ contacts }: { contacts: any[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(email: string, e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(email)
    setCopied(email)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="absolute bottom-full left-0 mb-2 z-50 w-64 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg p-3 flex flex-col gap-2.5">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Buying Committee</p>
      {contacts.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500">No contacts yet</p>
      ) : contacts.map((c, i) => {
        const verified  = c.email_verified || c.email_confidence === 'verified'
        const probable  = c.email_confidence === 'probable'
        const dotColor  = verified ? 'bg-emerald-400' : probable ? 'bg-amber-400' : 'bg-gray-300 dark:bg-neutral-600'
        return (
          <div key={i} className="flex items-start gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-stone-100 dark:bg-neutral-800 flex items-center justify-center text-[11px] font-semibold text-gray-600 dark:text-slate-300">
                {initials(c.name)}
              </div>
              <span className={cn('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-neutral-900', dotColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate leading-tight">{c.name || '—'}</p>
              {c.email ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 truncate flex-1">{c.email}</span>
                  <button onClick={e => copy(c.email, e)} className="flex-shrink-0 text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 transition-colors">
                    {copied === c.email ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                  {c.phone
                    ? <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} title={c.phone} className="flex-shrink-0 text-gray-300 dark:text-slate-600 hover:text-blue-500 transition-colors"><Phone size={10} /></a>
                    : <span className="flex-shrink-0 text-gray-200 dark:text-slate-700" title="No phone"><PhoneOff size={10} /></span>
                  }
                </div>
              ) : (
                <p className="text-[11px] text-gray-300 dark:text-slate-600 mt-0.5 italic">No email found</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QualPopover({ summary }: { summary: string | null }) {
  return (
    <div className="absolute bottom-full left-7 mb-2 z-50 w-72 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg p-3">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Qualification Summary</p>
      {summary ? (
        <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line">{summary}</p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-slate-500 italic">No summary available yet</p>
      )}
    </div>
  )
}

const AGENT_META: Record<string, { icon: React.ElementType; color: string }> = {
  discovery:            { icon: Pentagon,  color: 'text-indigo-500'  },
  research:             { icon: Aperture,  color: 'text-purple-500'  },
  company_intel:        { icon: Octagon,   color: 'text-sky-500'     },
  contact:              { icon: Aperture,  color: 'text-pink-500'    },
  enrichment:           { icon: Circle,    color: 'text-orange-500'  },
  qualification:        { icon: Squircle,  color: 'text-emerald-500 dark:text-emerald-400' },
  handoff:              { icon: Pentagon,  color: 'text-teal-500'    },
  research_critic:      { icon: Squircle,  color: 'text-violet-500 dark:text-violet-400'  },
  contact_critic:       { icon: Atom,      color: 'text-rose-500'    },
  enrichment_critic:    { icon: Squircle,  color: 'text-amber-500 dark:text-amber-400'   },
  qualification_critic: { icon: Atom,      color: 'text-cyan-500'    },
  outreach_critic:      { icon: Atom,      color: 'text-lime-500'    },
  supervisor_critic:    { icon: Atom,      color: 'text-fuchsia-500' },
  system_llm:           { icon: Atom,      color: 'text-pink-400'    },
}


const RERUN_OPTIONS = [
  { value: 'research',      label: 'Re-run from Research' },
  { value: 'contact',       label: 'Re-run from Contact' },
  { value: 'enrichment',    label: 'Re-run from Enrichment' },
  { value: 'qualification', label: 'Re-run Qualification only' },
]

const RUN_ONLY_OPTIONS = [
  { value: 'research',      label: 'Research only'      },
  { value: 'contact',       label: 'Contact only'       },
  { value: 'enrichment',    label: 'Enrichment only'    },
  { value: 'qualification', label: 'Qualification only' },
]


interface LeadCardProps {
  lead: any
  runStatus?: string
  isRunning?: boolean
  onRun: (id: string) => void
  onRerun: (id: string, from: string) => void
  onRunOnly: (id: string, agentType: string) => void
  selected?: boolean
  onSelect: (id: string) => void
  onOpen?: (id: string) => void
  onSetGroup?: (id: string) => void
}

export default function LeadCard({
  lead, runStatus, onRun, onRerun, onRunOnly, selected, onSelect, onOpen, onSetGroup,
}: LeadCardProps) {
  const score    = lead.qualification_score
  const tier      = lead.priority_tier ?? ''
  const hasCRM    = !!lead.crm_record_id
  const location  = [lead.hq_city, lead.hq_state, lead.hq_country].filter(Boolean).join(', ')
  const ranAgents: { agent_type: string; status: string }[] = lead.ran_agents ?? []

  const scoreColour =
    score == null  ? 'text-gray-300 dark:text-slate-600'
    : score >= 55  ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 30  ? 'text-amber-500 dark:text-amber-400'
                   : 'text-red-500 dark:text-red-400'

  const barColour =
    score == null  ? 'bg-gray-100 dark:bg-neutral-800'
    : score >= 55  ? 'bg-emerald-400'
    : score >= 30  ? 'bg-amber-400'
                   : 'bg-red-400'

  const tierStyle =
    tier === 'HOT'      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
    : tier === 'WARM'   ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
    : tier === 'STANDARD' ? 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-slate-400'
    : null

  const assignees: string[] = lead.assignees ?? []

  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900 rounded-2xl p-4 cursor-pointer group relative transition-shadow hover:shadow-sm dark:shadow-none',
        selected && 'ring-2 ring-indigo-400 dark:ring-indigo-500'
      )}
      onClick={() => onOpen ? onOpen(lead.id) : onSelect(lead.id)}
    >
      {/* ── Top row: badges + CRM + menu ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.vertical && (
            <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', VERTICAL_COLOURS[lead.vertical] ?? 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-slate-400')}>
              {lead.vertical.charAt(0).toUpperCase() + lead.vertical.slice(1)}
            </span>
          )}
          {lead.lifecycle_stage && (
            <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', STAGE_COLOURS[lead.lifecycle_stage] ?? 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-slate-400')}>
              {lead.lifecycle_stage.replace(/_/g, ' ')}
            </span>
          )}
          {hasCRM && (
            <span title="Synced to CRM" className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
              <Link2 size={9} strokeWidth={2} />
              CRM
            </span>
          )}
        </div>

        {/* ··· dropdown */}
        <div className="relative group/menu flex-shrink-0">
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500"
            onClick={e => e.stopPropagation()}
          >
            <MoreHorizontal size={15} />
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-md z-20 hidden group-hover/menu:block">
            <button
              onClick={e => { e.stopPropagation(); onRun(lead.id) }}
              className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-t-xl flex items-center gap-2"
            >
              <Play size={11} /> Run pipeline
            </button>
            <div className="border-t border-gray-100 dark:border-neutral-800" />
            {RERUN_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={e => { e.stopPropagation(); onRerun(lead.id, o.value) }}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <RotateCcw size={11} /> {o.label}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-neutral-800" />
            <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Run only</p>
            {RUN_ONLY_OPTIONS.map((o, i) => {
              const agentMeta = AGENT_META[o.value] ?? { icon: Circle, color: 'text-gray-400 dark:text-slate-500' }
              const Icon = agentMeta.icon
              return (
                <button
                  key={o.value}
                  onClick={e => { e.stopPropagation(); onRunOnly(lead.id, o.value) }}
                  className={cn('w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2', i === RUN_ONLY_OPTIONS.length - 1 && !onSetGroup && 'rounded-b-xl')}
                >
                  <Icon size={11} className={agentMeta.color} strokeWidth={1.75} /> {o.label}
                </button>
              )
            })}
            {onSetGroup && (
              <>
                <div className="border-t border-gray-100 dark:border-neutral-800" />
                <button
                  onClick={e => { e.stopPropagation(); onSetGroup(lead.id) }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-b-xl flex items-center gap-2"
                >
                  <Building2 size={11} className="text-indigo-400" /> Set Group
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Company name + domain ── */}
      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-snug mb-0.5">{lead.company_name}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-1.5">{lead.domain}</p>

      {/* ── Location ── */}
      {location && (
        <div className="flex items-center gap-1 mb-1.5">
          <MapPin size={10} className="text-gray-300 dark:text-slate-600 flex-shrink-0" />
          <span className="text-[11px] text-gray-400 dark:text-slate-500">{location}</span>
        </div>
      )}

      {/* ── Corporate group badge ── */}
      {lead.corporate_group ? (
        <div className="flex items-center gap-1 mb-3">
          <Building2 size={10} className="text-indigo-300 dark:text-indigo-600 flex-shrink-0" />
          <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium truncate">
            {lead.corporate_group.name}
          </span>
          {lead.is_group_parent && (
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-400 px-1 py-px rounded ml-0.5">
              Parent
            </span>
          )}
        </div>
      ) : (
        <div className={location ? 'mb-3' : 'mb-3'} />
      )}

      {/* ── Score row ── */}
      <div className="mb-1">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-sm font-bold', scoreColour)}>
              {score != null ? score : '—'}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              score{lead.modified ? ` · ${formatRelativeTime(lead.modified)}` : ''}
            </span>
          </div>
          {tierStyle && (
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', tierStyle)}>
              {tier.charAt(0) + tier.slice(1).toLowerCase()}
            </span>
          )}
        </div>

        {/* Score bar */}
        <div className="h-1 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColour)}
            style={{ width: score != null ? `${Math.min(score, 100)}%` : '0%' }}
          />
        </div>
      </div>

      {/* ── Run status ── */}
      {runStatus && (
        <div className="mt-2 mb-1">
          <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
            {runStatus}
          </span>
        </div>
      )}

      {/* ── Bottom row: left icons + right agents ── */}
      <div className="flex items-end justify-between mt-3">

        {/* Left: contacts + qual summary */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Popover
            trigger={
              <button className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <Users size={13} strokeWidth={1.75} />
              </button>
            }
          >
            <ContactsPopover contacts={lead.contacts ?? []} />
          </Popover>

          {lead.qualification_summary && (
            <Popover
              trigger={
                <button className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <MessageSquare size={13} strokeWidth={1.75} />
                </button>
              }
            >
              <QualPopover summary={lead.qualification_summary} />
            </Popover>
          )}
        </div>

        {/* Right: ran agents */}
        {ranAgents.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {ranAgents.map(({ agent_type, status }) => {
              const m    = AGENT_META[agent_type] ?? { icon: Circle, color: 'text-gray-400 dark:text-slate-500' }
              const Icon = m.icon
              return (
                <Icon key={agent_type} size={16} title={`${agent_type.replace(/_/g, ' ')} · ${status}`} className={m.color} strokeWidth={1.75} />
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
