'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Globe, Loader2, MapPin, Info, Calendar,
  ChevronDown, Plus, MoreVertical, Play, RotateCcw,
  Circle, Squircle, Aperture, Pentagon, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGE_COLOURS, VERTICAL_COLOURS, formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'
import CompanyAvatar from './CompanyAvatar'
import AddSubsidiaryModal from './AddSubsidiaryModal'
import { COLUMN_ACCENTS } from './GroupKanbanView'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Group {
  id: string
  name: string
  root_domain: string
  description?: string
  member_count: number
  created: string
}

interface Member {
  id: string
  company_name: string
  domain: string
  lifecycle_stage: string
  qualification_score: number | null
  hq_city?: string
  hq_state?: string
  contact_count: number
  vertical?: string
  priority_tier?: string
  modified?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RERUN_OPTIONS = [
  { value: 'research',      label: 'Re-run from Research'      },
  { value: 'contact',       label: 'Re-run from Contact'       },
  { value: 'enrichment',    label: 'Re-run from Enrichment'    },
  { value: 'qualification', label: 'Re-run Qualification only' },
]

const RUN_ONLY_OPTIONS: { value: string; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'research',      label: 'Research only',      icon: Pentagon,  color: 'text-indigo-500 dark:text-indigo-400'   },
  { value: 'contact',       label: 'Contact only',       icon: Aperture,  color: 'text-pink-500 dark:text-pink-400'       },
  { value: 'enrichment',    label: 'Enrichment only',    icon: Circle,    color: 'text-orange-500 dark:text-orange-400'   },
  { value: 'qualification', label: 'Qualification only', icon: Squircle,  color: 'text-emerald-500 dark:text-emerald-400' },
]

const TABLE_HEADERS: { label: string; info?: boolean }[] = [
  { label: 'Company' },
  { label: 'Domain',   info: true },
  { label: 'Vertical' },
  { label: 'Stage' },
  { label: 'Score' },
  { label: 'Priority' },
  { label: 'Location' },
  { label: 'Modified', info: true },
  { label: '' },
]

// ── Actions menu ──────────────────────────────────────────────────────────────

function MemberActionsMenu({
  member, onOpen, onSetGroup,
}: {
  member: Member
  onOpen: (id: string) => void
  onSetGroup: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const post = async (url: string, body?: object) => {
    setBusy(true)
    try { await api.post(url, body) } finally {
      setBusy(false)
      qc.invalidateQueries({ queryKey: ['group-members'] })
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(p => !p) }}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-lg p-1">
          <button
            disabled={busy}
            onClick={e => { e.stopPropagation(); post(`/leads/${member.id}/run/`) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run pipeline
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-neutral-800" />
          {RERUN_OPTIONS.map(o => (
            <button
              key={o.value}
              disabled={busy}
              onClick={e => { e.stopPropagation(); post(`/leads/${member.id}/rerun/`, { from: o.value }) }}
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
                disabled={busy}
                onClick={e => { e.stopPropagation(); post(`/leads/${member.id}/run_only/`, { agent_type: o.value }) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon className={cn('h-3 w-3 flex-shrink-0', o.color)} strokeWidth={1.75} /> {o.label}
              </button>
            )
          })}
          <div className="my-1 border-t border-slate-100 dark:border-neutral-800" />
          <button
            onClick={e => { e.stopPropagation(); onSetGroup(member.id); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Building2 className="h-3 w-3 flex-shrink-0 text-indigo-400" /> Set Group
          </button>
          <button
            onClick={e => { e.stopPropagation(); onOpen(member.id); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Building2 className="h-3 w-3 flex-shrink-0 text-slate-400" /> View details
          </button>
        </div>
      )}
    </div>
  )
}

// ── GroupTable — heading + optional description banner + table ─────────────────

function GroupTable({
  group, isExpanded, onToggle, onOpen, onSetGroup, onAddSubsidiary,
}: {
  group: Group
  isExpanded: boolean
  onToggle: () => void
  onOpen: (id: string) => void
  onSetGroup: (id: string) => void
  onAddSubsidiary: () => void
}) {
  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () =>
      api.get(`/corporate-groups/${group.id}/members`)
        .then(r => (Array.isArray(r.data) ? r.data : (r.data?.results ?? [])) as Member[]),
    staleTime: 60_000,
    enabled: isExpanded,
  })

  const allMembers = members ?? []

  return (
    <div className="flex flex-col gap-2">

      {/* ── Heading row ── */}
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={onToggle}
          className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors flex-shrink-0"
        >
          <ChevronDown className={cn(
            'h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )} />
        </button>

        <Building2 size={14} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />

        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {group.name}
        </span>

        <span className="text-slate-300 dark:text-slate-600 text-sm select-none">·</span>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
        </span>

        <div className="flex-1" />

        <button
          onClick={e => { e.stopPropagation(); onAddSubsidiary() }}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Plus size={12} /> Add Subsidiary
        </button>
      </div>

      {/* ── Description banner (always shown) ── */}
      <div className="rounded-2xl bg-stone-100 dark:bg-stone-800/40 px-4 py-3 flex flex-col gap-2">
        {group.description && (
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            {group.description}
          </p>
        )}
        <button className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors self-start">
          <Sparkles size={11} />
          Generate description
        </button>
      </div>

      {/* ── Table ── */}
      {isExpanded && (
        <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-zinc-900 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-neutral-800 border-b border-slate-200 dark:border-neutral-700">
                {TABLE_HEADERS.map((h, i) => (
                  <th key={i} className="px-4 py-4 text-left text-sm font-medium text-black dark:text-slate-100 whitespace-nowrap">
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
                  <td colSpan={9} className="px-4 py-5">
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <Loader2 size={12} className="animate-spin" /> Loading members…
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && allMembers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-5 text-xs text-slate-400 dark:text-slate-500">
                    No subsidiaries linked yet
                  </td>
                </tr>
              )}

              {!isLoading && allMembers.map(member => {
                const location = [member.hq_city, member.hq_state].filter(Boolean).join(', ')

                return (
                  <tr
                    key={member.id}
                    onClick={() => onOpen(member.id)}
                    className="border-b border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer last:border-b-0"
                  >
                    {/* Company */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg overflow-hidden flex-shrink-0">
                          <CompanyAvatar domain={member.domain} name={member.company_name} size="xs" />
                        </div>
                        <span className="text-sm font-medium text-black dark:text-slate-100 truncate max-w-[160px]">
                          {member.company_name}
                        </span>
                      </div>
                    </td>

                    {/* Domain */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <Globe className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className="truncate max-w-[160px]">{member.domain ?? '—'}</span>
                      </div>
                    </td>

                    {/* Vertical */}
                    <td className="px-4 py-4">
                      {member.vertical ? (
                        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', VERTICAL_COLOURS[member.vertical] ?? 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400')}>
                          {member.vertical.charAt(0).toUpperCase() + member.vertical.slice(1)}
                        </span>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-4">
                      {member.lifecycle_stage ? (
                        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', STAGE_COLOURS[member.lifecycle_stage] ?? 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400')}>
                          {member.lifecycle_stage.replace(/_/g, ' ')}
                        </span>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Score */}
                    <td className="px-4 py-4 text-sm font-medium">
                      <span className={cn(
                        member.qualification_score == null ? 'text-slate-300 dark:text-slate-600'
                        : member.qualification_score >= 55  ? 'text-emerald-600 dark:text-emerald-400'
                        : member.qualification_score >= 30  ? 'text-amber-500 dark:text-amber-400'
                                                            : 'text-red-500 dark:text-red-400'
                      )}>
                        {member.qualification_score ?? '—'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-4 text-sm text-black dark:text-slate-100">
                      {member.priority_tier
                        ? member.priority_tier.charAt(0) + member.priority_tier.slice(1).toLowerCase()
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
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

                    {/* Modified */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {member.modified ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          {formatRelativeTime(member.modified)}
                        </div>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-4" onClick={e => e.stopPropagation()}>
                      <MemberActionsMenu member={member} onOpen={onOpen} onSetGroup={onSetGroup} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── GroupTableView ────────────────────────────────────────────────────────────

interface Props {
  search: string
  onOpen: (id: string) => void
  onSetGroup: (id: string) => void
}

export default function GroupTableView({ search, onOpen, onSetGroup }: Props) {
  const [expanded,         setExpanded]         = useState<Set<string>>(new Set())
  const [addSubsidiaryFor, setAddSubsidiaryFor] = useState<Group | null>(null)
  const initialised = useRef(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['corporate-groups', search],
    queryFn: () =>
      api.get('/corporate-groups', { params: { q: search || undefined } })
        .then(r => (Array.isArray(r.data) ? r.data : (r.data?.results ?? [])) as Group[]),
    staleTime: 30_000,
  })

  const groups = data ?? []

  useEffect(() => {
    if (!initialised.current && groups.length > 0) {
      setExpanded(new Set(groups.map(g => g.id)))
      initialised.current = true
    }
  }, [groups])

  const toggleGroup = (id: string) =>
    setExpanded(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  if (isLoading) return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-center py-20 gap-2 text-sm text-slate-400 dark:text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Loading groups…
      </div>
    </div>
  )

  if (groups.length === 0) return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900">
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
          <Building2 size={20} className="text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {search ? `No groups matching "${search}"` : 'No corporate groups yet'}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Create one using the + button above</p>
      </div>
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-8">
        {groups.map(group => (
          <GroupTable
            key={group.id}
            group={group}
            isExpanded={expanded.has(group.id)}
            onToggle={() => toggleGroup(group.id)}
            onOpen={onOpen}
            onSetGroup={onSetGroup}
            onAddSubsidiary={() => setAddSubsidiaryFor(group)}
          />
        ))}
      </div>

      {addSubsidiaryFor && (
        <AddSubsidiaryModal
          group={addSubsidiaryFor}
          onClose={() => setAddSubsidiaryFor(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['group-members', addSubsidiaryFor.id] })
            qc.invalidateQueries({ queryKey: ['corporate-groups'] })
          }}
        />
      )}
    </>
  )
}
