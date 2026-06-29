'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GlobeLock, Flag, Globe, Users, Plus, Loader2, MapPin,
  MoreHorizontal, Play, RotateCcw, Circle, Octagon, Squircle, Aperture, Pentagon, Atom,
  MessageSquare, Link2, Copy, Check, Phone, PhoneOff,
  Calendar, Tag, ChevronDown,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGE_COLOURS, VERTICAL_COLOURS, formatRelativeTime } from '@/lib/utils'
import { Popover } from '@/components/ui/popover'
import Cookies from 'js-cookie'
import api from '@/lib/api'
import CompanyAvatar from './CompanyAvatar'
import AddSubsidiaryModal from './AddSubsidiaryModal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Group {
  id: string
  name: string
  root_domain: string
  description?: string
  member_count: number
  created: string
  created_by: string
  priority?: string | null
  effective_priority: 'low' | 'medium' | 'high'
  dominant_vertical?: string | null
}

interface Member {
  id: string
  company_name: string
  domain: string
  lifecycle_stage: string
  qualification_score: number | null
  hq_city?: string
  hq_state?: string
  hq_country?: string
  contact_count: number
  // optional — returned by some API responses
  vertical?: string
  crm_record_id?: string
  corporate_group?: { id: string; name: string } | null
  is_group_parent?: boolean
  priority_tier?: string
  modified?: string
  qualification_summary?: string | null
  ran_agents?: { agent_type: string; status: string }[]
  contacts?: any[]
}

// ── Constants — identical to LeadCard ────────────────────────────────────────

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
  { value: 'research',      label: 'Re-run from Research'      },
  { value: 'contact',       label: 'Re-run from Contact'       },
  { value: 'enrichment',    label: 'Re-run from Enrichment'    },
  { value: 'qualification', label: 'Re-run Qualification only' },
]

const RUN_ONLY_OPTIONS = [
  { value: 'research',      label: 'Research only'      },
  { value: 'contact',       label: 'Contact only'       },
  { value: 'enrichment',    label: 'Enrichment only'    },
  { value: 'qualification', label: 'Qualification only' },
]

export const COLUMN_ACCENTS = [
  'bg-indigo-400', 'bg-cyan-400', 'bg-violet-400', 'bg-emerald-400',
  'bg-pink-400',   'bg-amber-400', 'bg-sky-400',   'bg-rose-400',
]

// ── Helpers — identical to LeadCard ──────────────────────────────────────────

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Popovers — identical to LeadCard ─────────────────────────────────────────

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
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Buying Committee</p>
      {contacts.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">No contacts yet</p>
      ) : contacts.map((c, i) => {
        const verified = c.email_verified || c.email_confidence === 'verified'
        const probable = c.email_confidence === 'probable'
        const dotColor = verified ? 'bg-emerald-400' : probable ? 'bg-amber-400' : 'bg-gray-300 dark:bg-neutral-600'
        return (
          <div key={i} className="flex items-start gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-stone-100 dark:bg-neutral-800 flex items-center justify-center text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {initials(c.name)}
              </div>
              <span className={cn('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-neutral-900', dotColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">{c.name || '—'}</p>
              {c.email ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1">{c.email}</span>
                  <button onClick={e => copy(c.email, e)} className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors">
                    {copied === c.email ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                  {c.phone
                    ? <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} title={c.phone} className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-blue-500 transition-colors"><Phone size={10} /></a>
                    : <span className="flex-shrink-0 text-slate-200 dark:text-slate-700" title="No phone"><PhoneOff size={10} /></span>
                  }
                </div>
              ) : (
                <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5 italic">No email found</p>
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
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Qualification Summary</p>
      {summary ? (
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line">{summary}</p>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No summary available yet</p>
      )}
    </div>
  )
}

// ── Parent company card ───────────────────────────────────────────────────────

const GROUP_PRIORITY_STYLES: Record<string, { label: string; textClass: string; bgClass: string; tabRight: number }> = {
  // tabRight = SVG x where curve starts; card is w-[280px], viewBox 288 wide
  high:   { label: 'High Priority',   textClass: 'text-red-600 dark:text-red-400',       bgClass: 'bg-red-100 dark:bg-red-950/50',       tabRight: 129 },
  medium: { label: 'Medium Priority', textClass: 'text-pink-600 dark:text-pink-400',     bgClass: 'bg-pink-100 dark:bg-pink-950/50',     tabRight: 139 },
  low:    { label: 'Low Priority',    textClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-100 dark:bg-orange-950/50', tabRight: 122 },
}

const CREATED_BY_DISPLAY: Record<string, { label: string; isAgent: boolean }> = {
  haiku_agent:        { label: 'Haiku Agent', isAgent: true  },
  system:             { label: 'System',       isAgent: true  },
  manual:             { label: 'Manual',       isAgent: false },
  retroactive_linker: { label: 'Auto-linked',  isAgent: true  },
}

function formatCardDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function buildTabPath(tabRight: number): string {
  // G1-smooth: CP1 y=2 matches top line; CP2 y=25.25 matches shoulder — no kinks at joins
  const ce = tabRight + 56
  return [
    `M 18 2 L ${tabRight} 2`,
    `C ${(tabRight + 35).toFixed(2)} 2 ${(tabRight + 21).toFixed(2)} 25.25 ${ce.toFixed(2)} 25.25`,
    `L 268 25.25 Q 286 25.25 286 50`,
    `L 286 192 Q 286 208 270 208 L 18 208 Q 2 208 2 192 L 2 18 Q 2 2 18 2 Z`,
  ].join(' ')
}

function ParentCardShape({ selected, tabRight }: { selected: boolean; tabRight: number }) {
  const stroke = selected ? '#e879a0' : 'transparent'

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 288 210"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={buildTabPath(tabRight)}
        className={selected ? 'fill-pink-50 dark:fill-pink-950/30' : 'fill-neutral-100 dark:fill-neutral-800'}
        stroke={stroke}
        strokeWidth="2"
      />
    </svg>
  )
}

function ParentCard({
  group, selected, onSelect, onAddSubsidiary,
}: {
  group: Group
  selected: boolean
  onSelect: () => void
  onAddSubsidiary: () => void
}) {
  const priority  = group.effective_priority ?? 'low'
  const pStyle    = GROUP_PRIORITY_STYLES[priority] ?? GROUP_PRIORITY_STYLES.low
  const createdBy = CREATED_BY_DISPLAY[group.created_by] ?? { label: group.created_by, isAgent: false }
  const dateStr   = group.created ? formatCardDate(group.created) : ''
  const qc        = useQueryClient()

  const [generatingDesc,  setGeneratingDesc]  = useState(false)
  const [descThinking,    setDescThinking]    = useState('')
  const [thinkingOpen,    setThinkingOpen]    = useState(false)
  const [descExpanded,    setDescExpanded]    = useState(false)

  async function handleGenerateDesc(e: React.MouseEvent) {
    e.stopPropagation()
    if (generatingDesc) return
    setGeneratingDesc(true)
    setDescThinking('')
    setThinkingOpen(true)
    try {
      const token   = Cookies.get('access_token')
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''
      const res     = await fetch(
        `${apiBase}/api/console/corporate-groups/${group.id}/generate-description`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )
      if (!res.ok || !res.body) return

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const evt = JSON.parse(raw)
            if (evt.type === 'thinking_chunk') {
              setDescThinking(prev => prev + evt.content)
            } else if (evt.type === 'description') {
              group.description = evt.description
              qc.invalidateQueries({ queryKey: ['corporate-groups'] })
            }
          } catch {}
        }
      }
    } catch {}
    finally { setGeneratingDesc(false) }
  }

  return (
    <div
      className="relative w-full mb-3"
      onClick={onSelect}
    >
      <ParentCardShape selected={selected} tabRight={pStyle.tabRight} />

      <div className="relative z-10 px-4 pt-3 pb-4 h-full flex flex-col">
        {/* ··· menu — absolute, aligned with the body's straight top line (~15% down) */}
        <div className="absolute right-3 top-0 group/menu">
          <button
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            onClick={e => e.stopPropagation()}
          >
            <MoreHorizontal size={14} />
          </button>
          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-md z-20 hidden group-hover/menu:block">
            <button
              onClick={e => { e.stopPropagation(); onAddSubsidiary() }}
              className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
            >
              <Plus size={11} /> Add Subsidiary
            </button>
          </div>
        </div>

        {/* Priority — tab section only */}
        <div className={`flex items-center gap-1.5 text-xs font-semibold mb-3 ${pStyle.textClass}`}>
          <Flag size={13} />
          {pStyle.label}
        </div>

        {/* Company name */}
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5 leading-snug truncate">
          {group.name}
        </h2>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 truncate">{group.root_domain}</p>

        {/* Created by + date */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            {createdBy.isAgent ? (
              <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                <Atom size={11} className="text-indigo-400" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-stone-900 flex items-center justify-center flex-shrink-0">
                <UserRound size={13} className="text-slate-400 dark:text-slate-500" />
              </div>
            )}
            <span className="text-xs truncate max-w-[120px] text-slate-600 dark:text-slate-400">{createdBy.label}</span> 
          </div>
          {dateStr && (
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Calendar size={12} />
              <span>{dateStr}</span>
            </div>
          )}
        </div>

        {/* Thinking collapsible — visible while generating and after if content exists */}
        {(generatingDesc || descThinking) && (
          <div className="w-full my-1.5">
            <button
              onClick={e => { e.stopPropagation(); setThinkingOpen(o => !o) }}
              className="flex items-center gap-1.5 py-0.5 w-full text-left"
            >
              <span className="relative shrink-0 w-4 h-4">
                {generatingDesc && <span className="absolute inset-0 rounded-full bg-blue-400/40 blur-sm animate-pulse scale-150" />}
                <img src="/Logo.svg" alt="" className="relative w-4 h-4" />
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-1">
                {generatingDesc ? 'Generating…' : 'Model reasoning'}
              </span>
              <svg
                className={`w-3 h-3 text-slate-300 dark:text-neutral-600 transition-transform duration-200 ${thinkingOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {thinkingOpen && (
              <div className="mt-1 rounded-xl bg-stone-900 dark:bg-neutral-950 border border-stone-700 dark:border-neutral-800 p-2.5">
                <p className="font-mono text-[10px] text-stone-300 leading-relaxed whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                  {descThinking || (generatingDesc ? 'Reasoning…' : '—')}
                  {generatingDesc && !descThinking && (
                    <span className="inline-block w-1.5 h-3 bg-blue-400 animate-pulse ml-0.5 align-middle" />
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Description badge */}
        <div className="w-full my-1 relative">
          {/* Text — clipped at ~3 lines when collapsed */}
          <div
            className={`w-full text-xs text-slate-500 bg-stone-100 dark:bg-stone-800 dark:text-slate-400 px-3 pt-1.5 pb-7 rounded-xl leading-relaxed min-h-[2.25rem] transition-[max-height] duration-200 ${
              descExpanded ? '' : 'max-h-[4.5rem] overflow-hidden'
            }`}
          >
            {group.description || (
              <span className="text-slate-300 dark:text-slate-600">No description specified.</span>
            )}
          </div>

          {/* Gradient fade at bottom edge when collapsed */}
          {!descExpanded && group.description && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-stone-100 dark:from-stone-800 to-transparent rounded-b-xl pointer-events-none" />
          )}

          {/* Expand / collapse + generate buttons row */}
          <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
            {group.description && (
              <button
                onClick={e => { e.stopPropagation(); setDescExpanded(x => !x) }}
                title={descExpanded ? 'Collapse' : 'Expand'}
                className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${descExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
            <button
              onClick={handleGenerateDesc}
              disabled={generatingDesc}
              title="Generate description"
              className="disabled:opacity-50 transition-opacity bg-stone-200 dark:bg-stone-900 rounded-full p-0.5"
            >
              <span className="relative block w-6 h-6">
                {generatingDesc && <span className="absolute inset-0 rounded-full bg-blue-400/40 blur-sm animate-pulse scale-150" />}
                <img src="/Logo.svg" alt="" className="relative w-6 h-6 opacity-60 hover:opacity-100 transition-opacity" />
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-neutral-800 pt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <CompanyAvatar domain={group.root_domain} name={group.name} size="xxs" />
            <span>{group.member_count} {group.member_count === 1 ? 'company' : 'companies'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Tag size={14} />
            <span className="capitalize">{group.dominant_vertical ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Member card — structure identical to LeadCard ─────────────────────────────

function MemberCard({
  member, onOpen, onSetGroup,
}: { member: Member; onOpen: (id: string) => void; onSetGroup: (id: string) => void }) {
  const qc       = useQueryClient()
  const score    = member.qualification_score
  const tier     = member.priority_tier ?? ''
  const hasCRM   = !!member.crm_record_id
  const location = [member.hq_city, member.hq_state, member.hq_country].filter(Boolean).join(', ')
  const ranAgents: { agent_type: string; status: string }[] = member.ran_agents ?? []

  const scoreColour =
    score == null ? 'text-slate-300 dark:text-slate-600'
    : score >= 55 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 30 ? 'text-amber-500 dark:text-amber-400'
                  : 'text-red-500 dark:text-red-400'

  const barColour =
    score == null ? 'bg-gray-100 dark:bg-neutral-800'
    : score >= 55 ? 'bg-emerald-400'
    : score >= 30 ? 'bg-amber-400'
                  : 'bg-red-400'

  const tierStyle =
    tier === 'HOT'      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
    : tier === 'WARM'   ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
    : tier === 'STANDARD' ? 'bg-gray-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400'
    : null

  const run = (url: string, body?: object) =>
    api.post(url, body).then(() => qc.invalidateQueries({ queryKey: ['group-members'] }))

  return (
    <div
      className="bg-white dark:bg-zinc-900 rounded-2xl p-4 cursor-pointer group relative transition-shadow hover:shadow-sm dark:shadow-none"
      onClick={() => onOpen(member.id)}
    >
      {/* ── Top row: badges + CRM + ··· menu ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {member.vertical && (
            <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', VERTICAL_COLOURS[member.vertical] ?? 'bg-gray-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400')}>
              {member.vertical.charAt(0).toUpperCase() + member.vertical.slice(1)}
            </span>
          )}
          {member.lifecycle_stage && (
            <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', STAGE_COLOURS[member.lifecycle_stage] ?? 'bg-gray-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400')}>
              {member.lifecycle_stage.replace(/_/g, ' ')}
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
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500"
            onClick={e => e.stopPropagation()}
          >
            <MoreHorizontal size={15} />
          </button>
          <div
            className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-md z-20 hidden group-hover/menu:block"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => run(`/leads/${member.id}/run/`)}
              className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-t-xl flex items-center gap-2"
            >
              <Play size={11} /> Run pipeline
            </button>
            <div className="border-t border-gray-100 dark:border-neutral-800" />
            {RERUN_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => run(`/leads/${member.id}/rerun/`, { from: o.value })}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <RotateCcw size={11} /> {o.label}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-neutral-800" />
            <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Run only</p>
            {RUN_ONLY_OPTIONS.map((o, i) => {
              const agentMeta = AGENT_META[o.value] ?? { icon: Circle, color: 'text-slate-400 dark:text-slate-500' }
              const Icon = agentMeta.icon
              return (
                <button
                  key={o.value}
                  onClick={() => run(`/leads/${member.id}/run_only/`, { agent_type: o.value })}
                  className={cn('w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2', i === RUN_ONLY_OPTIONS.length - 1 && 'rounded-b-xl')}
                >
                  <Icon size={11} className={agentMeta.color} strokeWidth={1.75} /> {o.label}
                </button>
              )
            })}
            <div className="border-t border-gray-100 dark:border-neutral-800" />
            <button
              onClick={() => onSetGroup(member.id)}
              className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-b-xl flex items-center gap-2"
            >
              <GlobeLock size={11} className="text-indigo-400" /> Set Group
            </button>
          </div>
        </div>
      </div>

      {/* ── Company name + domain ── */}
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug mb-0.5">{member.company_name}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">{member.domain}</p>

      {/* ── Location ── */}
      {location && (
        <div className="flex items-center gap-1 mb-1.5">
          <MapPin size={15} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
          <span className="text-xs text-slate-400 dark:text-slate-500">{location}</span>
        </div>
      )}

      {/* ── Corporate group badge / spacer ── */}
      {member.corporate_group ? (
        <div className="flex items-center gap-1 mb-3">
          <GlobeLock size={15} className="text-cyan-600 dark:text-cyan-600 flex-shrink-0" />
          <span className="text-xs text-cyan-600 dark:text-cyan-600 font-normal truncate">
            {member.corporate_group.name}
          </span>
          {member.is_group_parent && (
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-400 px-1 py-px rounded ml-0.5">
              Parent
            </span>
          )}
        </div>
      ) : (
        <div className="mb-3" />
      )}

      {/* ── Score row ── */}
      <div className="mb-1">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-sm font-bold', scoreColour)}>
              {score != null ? score : '—'}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              score{member.modified ? ` · ${formatRelativeTime(member.modified)}` : ''}
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

      {/* ── Bottom row: left icons + right agents ── */}
      <div className="flex items-end justify-between mt-3">

        {/* Left: contacts + qual summary */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Popover
            trigger={
              <button className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <Users size={13} strokeWidth={1.75} />
              </button>
            }
          >
            <ContactsPopover contacts={member.contacts ?? []} />
          </Popover>

          {member.qualification_summary && (
            <Popover
              trigger={
                <button className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <MessageSquare size={13} strokeWidth={1.75} />
                </button>
              }
            >
              <QualPopover summary={member.qualification_summary} />
            </Popover>
          )}
        </div>

        {/* Right: ran agents */}
        {ranAgents.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {ranAgents.map(({ agent_type, status }) => {
              const m    = AGENT_META[agent_type] ?? { icon: Circle, color: 'text-slate-400 dark:text-slate-500' }
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

// ── Group column ──────────────────────────────────────────────────────────────

function GroupColumn({
  group, accent, onOpen, onSetGroup,
}: {
  group: Group
  accent: string
  onOpen: (id: string) => void
  onSetGroup: (id: string) => void
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [parentSelected, setParentSelected] = useState(false)
  const qc = useQueryClient()

  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () =>
      api.get(`/corporate-groups/${group.id}/members`)
        .then(r => (Array.isArray(r.data) ? r.data : (r.data?.results ?? [])) as Member[]),
    staleTime: 60_000,
  })

  const allMembers = members ?? []

  return (
    <>
      <div className="flex-shrink-0 w-[280px]">
        {/* Column header */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', accent)} />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{group.name}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{group.member_count}</span>
        </div>

        {/* Scrollable cards */}
        <div
          className="flex flex-col gap-3 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          <ParentCard
            group={group}
            selected={parentSelected}
            onSelect={() => setParentSelected(s => !s)}
            onAddSubsidiary={() => setShowAddModal(true)}
          />

          {isLoading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 animate-pulse h-24" />
          ) : allMembers.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center text-xs text-slate-400 dark:text-slate-500">
              No subsidiaries yet
            </div>
          ) : (
            allMembers.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                onOpen={onOpen}
                onSetGroup={onSetGroup}
              />
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <AddSubsidiaryModal
          group={group}
          onClose={() => setShowAddModal(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['group-members', group.id] })
            qc.invalidateQueries({ queryKey: ['corporate-groups'] })
          }}
        />
      )}
    </>
  )
}

// ── GroupKanbanView ───────────────────────────────────────────────────────────

interface Props {
  search: string
  onOpen: (id: string) => void
  onSetGroup: (id: string) => void
}

export default function GroupKanbanView({ search, onOpen, onSetGroup }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['corporate-groups', search],
    queryFn: () =>
      api.get('/corporate-groups', { params: { q: search || undefined } })
        .then(r => (Array.isArray(r.data) ? r.data : (r.data?.results ?? [])) as Group[]),
    staleTime: 30_000,
  })

  const groups = data ?? []

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-sm text-slate-400 dark:text-slate-500">
      <Loader2 size={16} className="animate-spin" /> Loading groups…
    </div>
  )

  if (groups.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
        <GlobeLock size={20} className="text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {search ? `No groups matching "${search}"` : 'No corporate groups yet'}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">Create one using the + button above</p>
    </div>
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {groups.map((g, i) => (
        <GroupColumn
          key={g.id}
          group={g}
          accent={COLUMN_ACCENTS[i % COLUMN_ACCENTS.length]}
          onOpen={onOpen}
          onSetGroup={onSetGroup}
        />
      ))}
    </div>
  )
}
