'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, Pencil, Check, Globe, MapPin, Users, Play, RotateCcw,
  Building2, Phone, Clock, ChevronDown, ExternalLink, Shield,
  AlertTriangle, DollarSign, Activity, Briefcase, TrendingUp,
  Copy, Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import { leadApi } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const VERTICALS = ['casino', 'airport', 'hospital', 'transit', 'mall']

const STAGES = [
  'raw_signal', 'discovery', 'research', 'contact', 'enrichment',
  'qualification', 'sql', 'mql', 'needs_review', 'disqualified',
  'mbody_active', 'human_assigned', 'meeting_booked', 'closed_won', 'closed_lost',
]

const RERUN_OPTIONS = [
  { value: 'research',      label: 'Re-run from Research'     },
  { value: 'contact',       label: 'Re-run from Contact'      },
  { value: 'enrichment',    label: 'Re-run from Enrichment'   },
  { value: 'qualification', label: 'Re-run Qualification only' },
]

const CONTACT_COLOURS = [
  'bg-indigo-500', 'bg-teal-500', 'bg-pink-500', 'bg-purple-500',
  'bg-amber-500',  'bg-emerald-500', 'bg-sky-500', 'bg-rose-500',
]

const EVENT_STYLE: Record<string, string> = {
  pipeline_run:                      'bg-blue-50  dark:bg-blue-950/40   text-blue-600  dark:text-blue-400',
  stage_transition:                  'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
  human_review:                      'bg-amber-50 dark:bg-amber-950/40  text-amber-600 dark:text-amber-400',
  manual_edit:                       'bg-teal-50  dark:bg-teal-950/40   text-teal-600  dark:text-teal-400',
  company_structure_manual_override: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  crm_sync:                          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  qualification_routed_to_nurture:   'bg-cyan-50  dark:bg-cyan-950/40   text-cyan-600  dark:text-cyan-400',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function scoreBarColour(v: number | null) {
  if (v == null) return 'bg-gray-200 dark:bg-neutral-700'
  if (v >= 55)  return 'bg-emerald-400'
  if (v >= 30)  return 'bg-amber-400'
  return 'bg-red-400'
}

function scoreTextColour(v: number | null) {
  if (v == null) return 'text-gray-300 dark:text-slate-600'
  if (v >= 55)  return 'text-emerald-600 dark:text-emerald-400'
  if (v >= 30)  return 'text-amber-500 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs text-gray-500 dark:text-slate-400 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', scoreBarColour(value))}
          style={{ width: value != null ? `${Math.min(value, 100)}%` : '0%' }}
        />
      </div>
      <span className={cn('text-xs font-bold w-7 text-right flex-shrink-0', scoreTextColour(value))}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function InfoRow({
  icon: Icon, label, value, editing, onChange, placeholder, type = 'text',
}: {
  icon: React.ElementType; label: string; value: string | number | null
  editing: boolean; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-neutral-800/60 last:border-0">
      <Icon size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
      <span className="w-28 text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 pt-0.5">{label}</span>
      {editing ? (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 dark:focus:border-teal-600 text-gray-800 dark:text-slate-200 placeholder:text-gray-300 dark:placeholder:text-slate-600 transition-colors"
        />
      ) : (
        <span className="text-sm text-gray-800 dark:text-slate-200 flex-1 leading-snug">
          {value != null && value !== '' ? String(value) : <span className="text-gray-300 dark:text-slate-600 text-xs italic">Not set</span>}
        </span>
      )}
    </div>
  )
}

function SelectRow({
  icon: Icon, label, value, options, editing, onChange,
}: {
  icon: React.ElementType; label: string; value: string | null
  options: { value: string; label: string }[]; editing: boolean; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-neutral-800/60 last:border-0">
      <Icon size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
      <span className="w-28 text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 pt-0.5">{label}</span>
      {editing ? (
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="flex-1 text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-teal-500/30 text-gray-800 dark:text-slate-200"
        >
          <option value="">—</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <span className="text-sm text-gray-800 dark:text-slate-200 flex-1">
          {options.find(o => o.value === value)?.label ?? <span className="text-gray-300 dark:text-slate-600 text-xs italic">Not set</span>}
        </span>
      )}
    </div>
  )
}

function ContactCard({ contact, index }: { contact: any; index: number }) {
  const colour   = CONTACT_COLOURS[index % CONTACT_COLOURS.length]
  const verified = contact.email_confidence === 'verified' || contact.email_verified
  const probable = contact.email_confidence === 'probable'
  const [copied, setCopied] = useState(false)

  const copyEmail = () => {
    navigator.clipboard.writeText(contact.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-neutral-800 last:border-0">
      <div className="relative flex-shrink-0">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white', colour)}>
          {initials(contact.name)}
        </div>
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900',
          verified ? 'bg-emerald-400' : probable ? 'bg-amber-400' : 'bg-gray-300 dark:bg-neutral-600'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{contact.name}</p>
          {contact.buying_role && (
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-1.5 py-px rounded-full font-medium">
              {contact.buying_role.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{contact.title || '—'}</p>
        {contact.email && (
          <p className="text-xs text-teal-600 dark:text-teal-400 font-mono truncate">{contact.email}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {contact.email && (
          <>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              verified ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : probable ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-slate-400'
            )}>
              {contact.email_confidence?.replace(/_/g, ' ') ?? 'unknown'}
            </span>
            <button
              onClick={copyEmail}
              className="p-1 rounded text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 transition-colors"
              title="Copy email"
            >
              {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface LeadDetailModalProps {
  leadId: string
  onClose: () => void
  onRun: (id: string) => void
  onRerun: (id: string, from: string) => void
  onRunOnly: (id: string, agentType: string) => void
}

type Draft = {
  company_name: string
  domain: string
  vertical: string
  lifecycle_stage: string
  hq_city: string
  hq_state: string
  hq_country: string
  hq_phone: string
  employee_count: string
  revenue_range: string
  currency: string
  qualification_summary: string
}

function buildDraft(lead: any): Draft {
  return {
    company_name:          lead.company_name ?? '',
    domain:                lead.domain ?? '',
    vertical:              lead.vertical ?? '',
    lifecycle_stage:       lead.lifecycle_stage ?? '',
    hq_city:               lead.hq_city ?? '',
    hq_state:              lead.hq_state ?? '',
    hq_country:            lead.hq_country ?? '',
    hq_phone:              lead.hq_phone ?? '',
    employee_count:        lead.employee_count != null ? String(lead.employee_count) : '',
    revenue_range:         lead.revenue_range ?? '',
    currency:              lead.currency ?? '',
    qualification_summary: lead.qualification_summary ?? '',
  }
}

export default function LeadDetailModal({
  leadId, onClose, onRun, onRerun, onRunOnly,
}: LeadDetailModalProps) {
  const qc = useQueryClient()

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead-detail', leadId],
    queryFn:  () => leadApi.getDetail(leadId),
    staleTime: 15_000,
  })

  const [editing,          setEditing]          = useState(false)
  const [draft,            setDraft]            = useState<Draft | null>(null)
  const [rerunOpen,        setRerunOpen]        = useState(false)
  const [showAllContacts,  setShowAllContacts]  = useState(false)
  const [copiedDomain,     setCopiedDomain]     = useState(false)
  const rerunRef = useRef<HTMLDivElement>(null)

  // Initialise draft when lead first loads (or after a successful save)
  useEffect(() => {
    if (lead && !editing) setDraft(buildDraft(lead))
  }, [lead]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close rerun dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (rerunRef.current && !rerunRef.current.contains(e.target as Node)) setRerunOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ESC closes modal
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => leadApi.update(leadId, data),
    onSuccess: (updated) => {
      qc.setQueryData(['lead-detail', leadId], updated)
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['leads-kanban'] })
      setDraft(buildDraft(updated))
      setEditing(false)
    },
  })

  const set = (key: keyof Draft) => (value: string) =>
    setDraft(d => d ? { ...d, [key]: value } : d)

  const handleSave = () => {
    if (!lead || !draft) return
    const changes: Record<string, any> = {}
    const orig = buildDraft(lead)
    ;(Object.keys(draft) as (keyof Draft)[]).forEach(k => {
      if (draft[k] !== orig[k]) {
        // Coerce employee_count to int or null
        if (k === 'employee_count') {
          changes[k] = draft[k] === '' ? null : parseInt(draft[k], 10) || null
        } else {
          changes[k] = draft[k] === '' ? null : draft[k]
        }
      }
    })
    if (Object.keys(changes).length > 0) {
      updateMutation.mutate(changes)
    } else {
      setEditing(false)
    }
  }

  const handleCancel = () => {
    if (lead) setDraft(buildDraft(lead))
    setEditing(false)
  }

  const copyDomain = () => {
    if (lead?.domain) {
      navigator.clipboard.writeText(lead.domain)
      setCopiedDomain(true)
      setTimeout(() => setCopiedDomain(false), 1500)
    }
  }

  const contacts: any[]        = lead?.contacts ?? []
  const events: any[]          = [...(lead?.events ?? [])].reverse().slice(0, 8)
  const agentRuns: any[]       = lead?.agent_executions ?? []
  const visibleContacts        = showAllContacts ? contacts : contacts.slice(0, 4)
  const location               = lead ? [lead.hq_city, lead.hq_state, lead.hq_country].filter(Boolean).join(', ') : ''
  const totalCost              = agentRuns.reduce((s, ae) => s + (ae.cost_usd ?? 0), 0)

  const d = draft  // shorthand

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-zinc-900"
        onClick={e => e.stopPropagation()}
      >

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-6 pt-5 pb-4 flex-shrink-0">

          {/* Top row: company name + edit / close */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              {editing && d ? (
                <input
                  value={d.company_name}
                  onChange={e => set('company_name')(e.target.value)}
                  className="w-full text-xl font-semibold text-white bg-white/15 rounded-xl px-3 py-1.5 outline-none border border-white/30 focus:border-white/70 placeholder:text-white/40 mb-2"
                  placeholder="Company name"
                />
              ) : (
                <h2 className="text-xl font-semibold text-white leading-snug truncate mb-1">
                  {lead?.company_name ?? (isLoading ? <span className="opacity-50">Loading…</span> : '—')}
                </h2>
              )}

              {/* Domain + location row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Globe size={12} className="text-white/60 flex-shrink-0" />
                {editing && d ? (
                  <input
                    value={d.domain}
                    onChange={e => set('domain')(e.target.value)}
                    className="text-sm text-white bg-white/15 rounded-lg px-2 py-0.5 outline-none border border-white/30 focus:border-white/70 placeholder:text-white/40 w-44"
                    placeholder="domain.com"
                  />
                ) : (
                  <>
                    <span className="text-sm text-white/80 font-mono">
                      {lead?.domain || <span className="italic text-white/40 font-sans">No domain</span>}
                    </span>
                    {lead?.domain && (
                      <button onClick={copyDomain} className="text-white/50 hover:text-white/80 transition-colors">
                        {copiedDomain ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    )}
                  </>
                )}
                {location && !editing && (
                  <>
                    <span className="text-white/30 mx-0.5">·</span>
                    <MapPin size={11} className="text-white/50 flex-shrink-0" />
                    <span className="text-xs text-white/60">{location}</span>
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  title="Edit lead"
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 text-white/70 hover:text-white transition-colors"
                >
                  <Pencil size={14} />
                </button>
              )}
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 text-white/70 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Bottom row: stage + vertical + score pills  ·  action buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {editing && d ? (
                <>
                  <select
                    value={d.lifecycle_stage}
                    onChange={e => set('lifecycle_stage')(e.target.value)}
                    className="text-xs bg-white/15 text-white border border-white/30 rounded-full px-2.5 py-1 outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s} className="text-gray-900 bg-white">{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <select
                    value={d.vertical}
                    onChange={e => set('vertical')(e.target.value)}
                    className="text-xs bg-white/15 text-white border border-white/30 rounded-full px-2.5 py-1 outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
                  >
                    <option value="" className="text-gray-900 bg-white">Vertical…</option>
                    {VERTICALS.map(v => (
                      <option key={v} value={v} className="text-gray-900 bg-white">{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  {lead?.lifecycle_stage && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/20 text-white">
                      {lead.lifecycle_stage.replace(/_/g, ' ')}
                    </span>
                  )}
                  {lead?.vertical && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 text-white/90">
                      {lead.vertical.charAt(0).toUpperCase() + lead.vertical.slice(1)}
                    </span>
                  )}
                  {lead?.qualification_score != null && (
                    <span className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 text-white'
                    )}>
                      Score {lead.qualification_score}
                    </span>
                  )}
                  {lead?.priority_tier && (
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      lead.priority_tier === 'HOT'      ? 'bg-red-400/30 text-red-100'
                      : lead.priority_tier === 'WARM'   ? 'bg-amber-400/30 text-amber-100'
                      : 'bg-white/10 text-white/70'
                    )}>
                      {lead.priority_tier}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Action buttons (only in view mode) */}
            {!editing && lead && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onRun(leadId)}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                >
                  <Play size={11} />
                  Run
                </button>

                <div className="relative" ref={rerunRef}>
                  <button
                    onClick={() => setRerunOpen(p => !p)}
                    className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors"
                  >
                    <RotateCcw size={11} />
                    <ChevronDown size={10} />
                  </button>
                  {rerunOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl z-50 py-1">
                      {RERUN_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          onClick={() => { onRerun(leadId, o.value); setRerunOpen(false) }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <RotateCcw size={10} className="text-gray-400" /> {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {lead.crm_record_id && (
                  <a
                    href={`https://app.hubspot.com/contacts/${lead.crm_record_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors"
                  >
                    <ExternalLink size={11} />
                    HubSpot
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ BODY ════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-6 animate-pulse">
              {[80, 60, 100, 50, 70].map((w, i) => (
                <div key={i} className={`h-5 bg-gray-100 dark:bg-neutral-800 rounded-lg`} style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : !lead ? (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-slate-500">Failed to load lead</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-neutral-800">

              {/* ── CONTACTS ─────────────────────────────────────────────── */}
              <section className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-gray-400 dark:text-slate-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
                    </span>
                  </div>
                  {contacts.length > 4 && (
                    <button
                      onClick={() => setShowAllContacts(p => !p)}
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      {showAllContacts ? 'Show fewer' : `+${contacts.length - 4} more`}
                    </button>
                  )}
                </div>

                {contacts.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic">
                    No contacts yet — run the contact stage to discover stakeholders.
                  </p>
                ) : (
                  <>
                    {/* Avatar strip */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {contacts.slice(0, 8).map((c, i) => (
                        <div
                          key={i}
                          className="relative flex-shrink-0"
                          title={`${c.name}${c.email ? ` · ${c.email}` : ''}`}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-zinc-900',
                            CONTACT_COLOURS[i % CONTACT_COLOURS.length]
                          )}>
                            {initials(c.name)}
                          </div>
                          {(c.email_confidence === 'verified' || c.email_verified) && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-zinc-900" />
                          )}
                        </div>
                      ))}
                      {contacts.length > 8 && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-gray-500 border-2 border-white dark:border-zinc-900">
                          +{contacts.length - 8}
                        </div>
                      )}
                    </div>

                    {/* Detail rows */}
                    <div>
                      {visibleContacts.map((c, i) => <ContactCard key={i} contact={c} index={i} />)}
                    </div>
                  </>
                )}
              </section>

              {/* ── PIPELINE SCORES ──────────────────────────────────────── */}
              <section className="px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-gray-400 dark:text-slate-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Pipeline Scores</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <ScoreRow label="Firmographic"   value={lead.firmographic_score}   />
                  <ScoreRow label="Buying Signal"  value={lead.buying_signal_score}  />
                  <ScoreRow label="Intent"         value={lead.intent_score}         />
                  <ScoreRow label="Stakeholder"    value={lead.stakeholder_score}    />
                  <ScoreRow label="Historical Win" value={lead.historical_win_score} />
                </div>

                {/* Qual summary */}
                {(lead.qualification_summary || editing) && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-neutral-800/50 rounded-xl">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
                      Qualification Summary
                    </p>
                    {editing && d ? (
                      <textarea
                        value={d.qualification_summary}
                        onChange={e => set('qualification_summary')(e.target.value)}
                        rows={4}
                        placeholder="Qualification summary…"
                        className="w-full text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-2 resize-none outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 dark:focus:border-teal-600 placeholder:text-gray-300 dark:placeholder:text-slate-600"
                      />
                    ) : (
                      <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
                        {lead.qualification_summary}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* ── COMPANY DETAILS ──────────────────────────────────────── */}
              <section className="px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={14} className="text-gray-400 dark:text-slate-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Company Details</span>
                </div>

                {editing && d ? (
                  <>
                    <InfoRow icon={MapPin}     label="City"           value={d.hq_city}       editing onChange={set('hq_city')}       placeholder="e.g. Peterborough" />
                    <InfoRow icon={MapPin}     label="Province/State" value={d.hq_state}      editing onChange={set('hq_state')}      placeholder="e.g. ON" />
                    <InfoRow icon={Globe}      label="Country"        value={d.hq_country}    editing onChange={set('hq_country')}    placeholder="e.g. CA" />
                    <InfoRow icon={Phone}      label="HQ Phone"       value={d.hq_phone}      editing onChange={set('hq_phone')}      placeholder="+1 ..." />
                    <InfoRow icon={Users}      label="Employees"      value={d.employee_count} editing onChange={set('employee_count')} type="number" placeholder="e.g. 500" />
                    <InfoRow icon={DollarSign} label="Revenue"        value={d.revenue_range} editing onChange={set('revenue_range')} placeholder="e.g. $50M–$100M" />
                    <SelectRow
                      icon={DollarSign} label="Currency" value={d.currency}
                      options={[{ value: 'CAD', label: 'CAD' }, { value: 'USD', label: 'USD' }]}
                      editing onChange={set('currency')}
                    />
                  </>
                ) : (
                  <>
                    <InfoRow icon={MapPin}     label="City"           value={lead.hq_city}        editing={false} onChange={() => {}} />
                    <InfoRow icon={MapPin}     label="Province/State" value={lead.hq_state}       editing={false} onChange={() => {}} />
                    <InfoRow icon={Globe}      label="Country"        value={lead.hq_country}     editing={false} onChange={() => {}} />
                    <InfoRow icon={Phone}      label="HQ Phone"       value={lead.hq_phone}       editing={false} onChange={() => {}} />
                    <InfoRow icon={Users}      label="Employees"      value={lead.employee_count} editing={false} onChange={() => {}} />
                    <InfoRow icon={DollarSign} label="Revenue"        value={lead.revenue_range}  editing={false} onChange={() => {}} />
                    <InfoRow icon={DollarSign} label="Currency"       value={lead.currency}       editing={false} onChange={() => {}} />
                  </>
                )}
              </section>

              {/* ── CORPORATE GROUP ──────────────────────────────────────── */}
              {lead.corporate_group && (
                <section className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={14} className="text-gray-400 dark:text-slate-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Corporate Group</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{lead.corporate_group.name}</span>
                    {lead.is_group_parent && (
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-2 py-0.5 rounded-full font-medium">Parent</span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      · {lead.corporate_group.member_count} propert{lead.corporate_group.member_count !== 1 ? 'ies' : 'y'}
                    </span>
                  </div>
                  {lead.subsidiaries && lead.subsidiaries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.subsidiaries.map((s: any) => (
                        <span
                          key={s.id}
                          className="text-xs bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-neutral-700"
                        >
                          {s.company_name}
                          {s.qualification_score != null && (
                            <span className={cn('ml-1.5 font-semibold', scoreTextColour(s.qualification_score))}>
                              {s.qualification_score}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* ── COMPLIANCE ───────────────────────────────────────────── */}
              <section className="px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-gray-400 dark:text-slate-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Compliance</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lead.is_quebec_excluded && (
                    <span className="flex items-center gap-1 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full border border-red-100 dark:border-red-900/40">
                      <AlertTriangle size={10} /> Québec excluded
                    </span>
                  )}
                  {lead.casl_compliant === true && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/40">
                      <Check size={10} /> CASL compliant
                    </span>
                  )}
                  {lead.hipaa_baa_required && (
                    <span className="flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-100 dark:border-amber-900/40">
                      <Shield size={10} /> HIPAA BAA required
                    </span>
                  )}
                  {lead.cross_border_flag && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900/40">
                      <Globe size={10} /> Cross-border
                    </span>
                  )}
                  {lead.crm_record_id && (
                    <span className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                      <Link2 size={10} /> CRM synced
                    </span>
                  )}
                  {!lead.is_quebec_excluded && !lead.casl_compliant && !lead.hipaa_baa_required && !lead.cross_border_flag && !lead.crm_record_id && (
                    <span className="text-xs text-gray-300 dark:text-slate-600 italic">No flags</span>
                  )}
                </div>
              </section>

              {/* ── RECENT ACTIVITY ──────────────────────────────────────── */}
              {events.length > 0 && (
                <section className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={14} className="text-gray-400 dark:text-slate-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Recent Activity</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {events.map((ev: any) => (
                      <div key={ev.id} className="flex items-center gap-2.5">
                        <span className={cn(
                          'text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0',
                          EVENT_STYLE[ev.event_type] ?? 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-slate-400'
                        )}>
                          {ev.event_type.replace(/_/g, ' ')}
                        </span>
                        {ev.old_stage && ev.new_stage && ev.old_stage !== ev.new_stage && (
                          <span className="text-xs text-gray-400 dark:text-slate-500">
                            {ev.old_stage} → {ev.new_stage}
                          </span>
                        )}
                        <span className="flex-1" />
                        <span className="text-[10px] text-gray-300 dark:text-slate-600 flex-shrink-0">
                          {ev.created ? formatRelativeTime(ev.created) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── AGENT RUNS ───────────────────────────────────────────── */}
              {agentRuns.length > 0 && (
                <section className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} className="text-gray-400 dark:text-slate-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Agent Runs</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">
                      {agentRuns.length} total · ${totalCost.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {agentRuns.map((ae: any) => (
                      <span
                        key={ae.id}
                        title={`${ae.agent_type} · ${ae.status}${ae.latency_ms ? ` · ${ae.latency_ms}ms` : ''}${ae.cost_usd ? ` · $${ae.cost_usd.toFixed(4)}` : ''}`}
                        className={cn(
                          'text-[10px] px-2.5 py-1 rounded-full font-medium cursor-default',
                          ae.status === 'success'  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : ae.status === 'failed' ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-slate-400'
                        )}
                      >
                        {ae.agent_type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>

        {/* ══ FOOTER (edit mode only) ══════════════════════════════════════════ */}
        {editing && (
          <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-3 bg-gray-50 dark:bg-neutral-800/50 border-t border-gray-100 dark:border-neutral-800">
            {updateMutation.isError && (
              <span className="text-xs text-red-500 mr-auto">Save failed — please try again</span>
            )}
            <button
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            >
              {updateMutation.isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
