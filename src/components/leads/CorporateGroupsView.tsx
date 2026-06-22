'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Building2, Loader2,
  Play, RotateCcw, Circle,
  Pentagon, Squircle, Aperture, ArrowRight,
  Globe, FileText, Users, Building,
  Plus, Bookmark,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import CompanyAvatar from './CompanyAvatar'
import AddSubsidiaryModal from './AddSubsidiaryModal'

// ── Types ──────────────────────────────────────────────────────────────────

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
}

// ── Vocabulary ─────────────────────────────────────────────────────────────

function stageLabel(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const STAGE_CLS: Record<string, string> = {
  sql:           'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  mql:           'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  qualification: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-900/20 dark:text-cyan-400',
  enrichment:    'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
  contact:       'bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400',
  research:      'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-400',
  discovery:     'bg-neutral-100 text-slate-500 dark:bg-neutral-700 dark:text-slate-400',
  raw_signal:    'bg-neutral-100 text-slate-500 dark:bg-neutral-700 dark:text-slate-400',
  needs_review:  'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  disqualified:  'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400',
}

const RUNNABLE = new Set([
  'raw_signal', 'discovery', 'research', 'contact',
  'enrichment', 'qualification', 'needs_review',
])

const RERUN_OPTIONS = [
  { value: 'research',      label: 'Re-run from Research'      },
  { value: 'contact',       label: 'Re-run from Contact'       },
  { value: 'enrichment',    label: 'Re-run from Enrichment'    },
  { value: 'qualification', label: 'Re-run from Qualification' },
]

const RUN_ONLY: { value: string; label: string; icon: React.ElementType; iconCls: string }[] = [
  { value: 'research',      label: 'Research only',      icon: Pentagon,  iconCls: 'text-indigo-500 dark:text-indigo-400' },
  { value: 'contact',       label: 'Contact only',       icon: Aperture,  iconCls: 'text-pink-500 dark:text-pink-400'     },
  { value: 'enrichment',    label: 'Enrichment only',    icon: Circle,    iconCls: 'text-orange-500 dark:text-orange-400' },
  { value: 'qualification', label: 'Qualification only', icon: Squircle,  iconCls: 'text-cyan-500 dark:text-cyan-400'},
]

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30)  return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [cb])
}

// ── Member action dropdown ─────────────────────────────────────────────────

function MemberMenu({
  memberId, stage, onClose,
}: { memberId: string; stage: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()
  useClickOutside(ref as React.RefObject<HTMLElement>, onClose)

  const post = async (url: string) => {
    setBusy(true)
    try { await api.post(url) } finally {
      setBusy(false)
      qc.invalidateQueries({ queryKey: ['group-members'] })
      onClose()
    }
  }

  const canRun  = RUNNABLE.has(stage)
  const isEarly = stage === 'raw_signal' || stage === 'discovery'

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-neutral-100 dark:border-neutral-700 z-50 overflow-hidden py-1.5"
      onClick={e => e.stopPropagation()}
    >
      {canRun && (
        <>
          <button
            disabled={busy}
            onClick={() => post(`/leads/${memberId}/run`)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Run pipeline
          </button>
          {!isEarly && <div className="h-px bg-neutral-100 dark:bg-neutral-700 mx-3 my-1" />}
        </>
      )}

      {canRun && !isEarly && RERUN_OPTIONS.map(o => (
        <button
          key={o.value}
          disabled={busy}
          onClick={() => post(`/leads/${memberId}/rerun?from=${o.value}`)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <RotateCcw size={12} /> {o.label}
        </button>
      ))}

      {canRun && <div className="h-px bg-neutral-100 dark:bg-neutral-700 mx-3 my-1" />}

      <p className="px-3.5 pt-1 pb-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        Run only
      </p>
      {RUN_ONLY.map(o => {
        const Icon = o.icon
        return (
          <button
            key={o.value}
            disabled={busy}
            onClick={() => post(`/leads/${memberId}/run-only?agent=${o.value}`)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <Icon size={12} className={o.iconCls} strokeWidth={1.75} /> {o.label}
          </button>
        )
      })}

      <div className="h-px bg-neutral-100 dark:bg-neutral-700 mx-3 my-1" />
      <a
        href={`/leads/${memberId}`}
        onClick={e => e.stopPropagation()}
        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
      >
        <ArrowRight size={12} /> View details
      </a>
    </div>
  )
}

// ── Member row (expanded list view) ───────────────────────────────────────

function MemberRow({ member }: { member: Member }) {
  const [hovered,  setHovered]  = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const label    = stageLabel(member.lifecycle_stage)
  const stageCls = STAGE_CLS[member.lifecycle_stage] ?? 'bg-neutral-100 text-slate-500 dark:bg-neutral-700 dark:text-slate-400'
  const showDots = hovered || menuOpen

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors duration-150 cursor-default',
        hovered ? 'bg-neutral-50 dark:bg-neutral-700/50' : 'bg-transparent'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-auto h-auto rounded-2xl flex-shrink-0 shadow-sm overflow-hidden bg-white dark:bg-neutral-700 border border-neutral-100 dark:border-neutral-600">
        <CompanyAvatar domain={member.domain} name={member.company_name} size="xs" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight truncate">
            {member.company_name}
          </span>
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', stageCls)}>
            {label}
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
          {member.domain}
        </p>
      </div>

      <div className="flex-shrink-0 relative">
        {showDots ? (
          <div
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className={cn(
              'w-8 h-8 rounded-xl border bg-white dark:bg-neutral-700 shadow-sm flex items-center justify-center cursor-pointer transition-colors',
              menuOpen
                ? 'border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20'
                : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
            )}
          >
            <svg
              className={cn('w-3.5 h-3.5', menuOpen ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8" />
        )}

        {menuOpen && (
          <MemberMenu
            memberId={member.id}
            stage={member.lifecycle_stage}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

// ── GroupCard ──────────────────────────────────────────────────────────────

const CHIPS_VISIBLE = 5

function GroupCard({ group }: { group: Group }) {
  const [chipsExpanded, setChipsExpanded] = useState(false)
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [saved,         setSaved]         = useState(false)
  const qc = useQueryClient()

  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () =>
      api.get(`/corporate-groups/${group.id}/members`)
        .then(r => (Array.isArray(r.data) ? r.data : (r.data?.results ?? [])) as Member[]),
    staleTime: 60_000,
  })

  const allMembers   = members ?? []
  const visibleChips = allMembers.slice(0, CHIPS_VISIBLE)
  const overflow     = allMembers.length - CHIPS_VISIBLE

  return (
    <>
      <div className="bg-white dark:bg-neutral-800 rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-neutral-100 dark:border-neutral-700/50 flex flex-col gap-4 w-full select-none">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-auto h-auto rounded-2xl flex-shrink-0 shadow-sm overflow-hidden bg-white dark:bg-neutral-700 border border-neutral-100 dark:border-neutral-600">
              <CompanyAvatar domain={group.root_domain} name={group.name} size="xs" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">
                {group.name}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {group.root_domain}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1">
            {timeAgo(group.created)}
          </span>
        </div>

        {/* ── Tag pills ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {/* Member count — teal tint with users icon */}
          <span className="inline-flex items-center gap-1.5 text-xs font-normal px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-cyan-900/20 dark:text-cyan-400">
            <Users size={11} strokeWidth={2} />
            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
          </span>
          {/* Corporate Account — neutral with building icon */}
          <span className="inline-flex items-center gap-1.5 text-xs font-normal px-3 py-1 rounded-full bg-neutral-100 text-slate-600 dark:bg-neutral-700 dark:text-slate-400 border border-neutral-200 dark:border-neutral-600">
            <Building size={11} strokeWidth={2} />
            Corporate Account
          </span>
        </div>

        {/* ── Info block ──────────────────────────────────────────────── */}
        <div className="bg-neutral-50 dark:bg-neutral-700/40 rounded-2xl px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Globe size={13} strokeWidth={1.75} className="text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-300">{group.root_domain}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={13} strokeWidth={1.75} className="text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {group.description ?? 'No description provided'}
            </span>
          </div>
        </div>

        {/* ── Member chips ────────────────────────────────────────────── */}
        <div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-1">
              <Loader2 size={12} className="animate-spin" /> Loading members…
            </div>
          ) : allMembers.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
              No subsidiaries linked yet
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleChips.map(m => (
                <button
                  key={m.id}
                  onClick={() => setChipsExpanded(v => !v)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 px-3 py-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-500 transition-colors"
                >
                  {/* green status dot */}
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 dark:bg-cyan-500 flex-shrink-0" />
                  {m.company_name}
                </button>
              ))}
              {overflow > 0 && (
                <button
                  onClick={() => setChipsExpanded(v => !v)}
                  className="text-xs text-slate-400 dark:text-slate-500 bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 px-3 py-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  +{overflow}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Expanded member list ─────────────────────────────────────── */}
        {chipsExpanded && allMembers.length > 0 && (
          <>
            <div className="h-px bg-neutral-100 dark:bg-neutral-700" />
            <div className="space-y-0.5">
              {allMembers.map(m => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
            <button
              onClick={() => setChipsExpanded(false)}
              className="w-full text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1"
            >
              Collapse
            </button>
          </>
        )}

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="h-px bg-neutral-100 dark:bg-neutral-700 -mx-1" />

        {/* ── CTA row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Bookmark */}
          <button
            onClick={() => setSaved(v => !v)}
            className={cn(
              'w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-colors',
              saved
                ? 'border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-neutral-200 dark:border-neutral-600 text-slate-400 dark:text-slate-500 bg-white dark:bg-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600'
            )}
            aria-label="Save group"
          >
            <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
          </button>

          {/* Add Subsidiary — "Create Account" style row button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="group flex-1 flex items-center justify-between gap-2 h-10 px-4 rounded-2xl bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-colors duration-150"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Building2 size={14} strokeWidth={1.75} className="text-slate-400 dark:text-slate-500" />
              Add Subsidiary
            </span>
            <span className="w-6 h-6 rounded-lg bg-white dark:bg-neutral-600 border border-neutral-200 dark:border-neutral-500 flex items-center justify-center group-hover:bg-cyan-500 group-hover:border-cyan-500 transition-colors duration-150">
              <Plus size={12} strokeWidth={2.5} className="text-slate-500 dark:text-slate-400 group-hover:text-white transition-colors duration-150" />
            </span>
          </button>
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

// ── CorporateGroupsView ────────────────────────────────────────────────────

interface Props {
  search: string
}

export default function CorporateGroupsView({ search }: Props) {
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
        <Building2 size={20} className="text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {search ? `No groups matching "${search}"` : 'No corporate groups yet'}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Create one using the + button above
      </p>
    </div>
  )

  return (
    <div className="grid grid-cols-4 gap-4">
      {groups.map(g => (
        <div key={g.id} className="min-w-0">
          <GroupCard group={g} />
        </div>
      ))}
    </div>
  )
}