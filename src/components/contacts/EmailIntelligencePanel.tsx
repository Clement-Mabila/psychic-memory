'use client'
import { type ReactNode, type ElementType, useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft, Mail, Phone, BadgeCheck, MoreHorizontal,
  Search, Crosshair, Grid3x3, Radio, Shield, List,
  Loader2, XCircle, Clock, AlertCircle, CheckCircle2,
  ArrowUpCircle, RefreshCw, TriangleAlert, ChevronDown, Calendar, Play,
  CircleFadingArrowUp, Goal, CalendarClock, CircleDashed,
  Target,
  Flag,
  Flame,
} from 'lucide-react'

// Linkedin is not exported by this version of lucide-react — kept as inline SVG
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import CompanyAvatar from '@/components/leads/CompanyAvatar'
import api from '@/lib/api'
import type { Contact, EITool, EIToolState, EICandidate, EITab, EIToolId } from './types'

// ── Constants ────────────────────────────────────────────────────────────────

const TOOL_META: Record<EIToolId, { icon: ElementType; description: string; costLabel: string; engineBadge: string; isFree: boolean }> = {
  local_discover:      { icon: Search,    description: 'Scrapes the company site and Bing, ranks 34 patterns via local Qwen3, then SMTP-verifies the top result. No API calls, no credits.', costLabel: 'Always free', engineBadge: 'Qwen3 · SMTP · local', isFree: true },
  hunter:              { icon: Crosshair, description: "Queries Hunter's B2B email database for this contact. Free on miss, 1 credit on found.", costLabel: 'Free on miss · 1 credit found', engineBadge: 'Hunter.io API', isFree: false },
  zerobounce_validate: { icon: Shield,    description: 'Deep SMTP deliverability check via ZeroBounce. Returns status, sub-status, spam-trap flags.', costLabel: '1 credit per result', engineBadge: 'ZeroBounce API', isFree: false },
  zerobounce_find:     { icon: Grid3x3,   description: 'Infers company email format from domain then constructs a candidate. Free on miss, 20 credits on found.', costLabel: 'Free on miss · 20 credits found', engineBadge: 'ZeroBounce API', isFree: false },
  smtp_probe:          { icon: Radio,     description: 'Direct MX lookup + EHLO/RCPT probe. Detects catch-all domains before spending ZeroBounce credits. Always free.', costLabel: 'Always free', engineBadge: 'SMTP · local', isFree: true },
  pattern_candidates:  { icon: List,      description: 'Generates all 34 North American corporate format candidates and ranks them via local Qwen3.', costLabel: 'Always free', engineBadge: 'Qwen3 · local', isFree: true },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function initToolState(id: EIToolId): EIToolState {
  return { toolId: id, state: 'idle', taskId: null, result: null, error: null, startedAt: null }
}

function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    verified: 'Verified', probable: 'Probable',
    inferred: 'Inferred', pattern_inferred: 'Inferred', not_found: 'No Email',
  }
  return map[tier] ?? tier
}

function tierChipCls(tier: string): string {
  if (tier === 'verified') return 'bg-green-600 text-white'
  if (tier === 'probable') return 'bg-amber-500 text-white'
  if (tier === 'inferred' || tier === 'pattern_inferred') return 'border font-normal  border bg-stone-100 text-zinc-600 dark:border-neutral-600 dark:text-slate-400'
  return 'border border-gray-200 text-slate-400 dark:border-neutral-700 dark:text-slate-500'
}

function patternForEmail(email: string, first: string, last: string): string {
  const local = email.split('@')[0] ?? ''
  const fi = first[0] ?? ''
  const li = last[0] ?? ''
  const checks: [string, string][] = [
    [`${first}.${last}`, '{first}.{last}'], [`${fi}${last}`, '{fi}{last}'],
    [first, '{first}'], [`${first}${last}`, '{first}{last}'],
    [`${fi}.${last}`, '{fi}.{last}'], [`${last}.${first}`, '{last}.{first}'],
    [`${last}${first}`, '{last}{first}'], [`${last}${fi}`, '{last}{fi}'],
    [`${first}.${li}`, '{first}.{li}'], [`${fi}.${li}`, '{fi}.{li}'],
    [`${fi}-${last}`, '{fi}-{last}'], [`${first}-${last}`, '{first}-{last}'],
    [`${first}_${last}`, '{first}_{last}'], [`${fi}_${last}`, '{fi}_{last}'],
    [`${last}-${first}`, '{last}-{first}'], [`${last}_${first}`, '{last}_{first}'],
    [`${li}${last}`, '{li}{last}'], [`${li}${first}`, '{li}{first}'],
  ]
  for (const [candidate, pat] of checks) if (local === candidate) return pat
  return local
}

function parseName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/)
  return { first: (parts[0] ?? '').toLowerCase(), last: (parts[parts.length - 1] ?? '').toLowerCase() }
}

// ── MonoEmail ─────────────────────────────────────────────────────────────────

function MonoEmail({ email }: { email: string }) {
  return <span className="text-blue-600 dark:text-blue-400 text-sm break-all">{email}</span>
}

// ── VerdictChip ───────────────────────────────────────────────────────────────

function VerdictChip({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
  const cfg: Record<string, string> = {
    valid:       'bg-green-100 text-green-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    catch_all:   'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    'catch-all': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    invalid:     'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    unknown:     'bg-gray-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400',
    no_mx:       'bg-gray-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400',
  }
  const cls = cfg[verdict.toLowerCase()] ?? 'bg-gray-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400'
  return (
    <span className={cn('inline-flex items-center text-xs font-bold  px-1.5 py-0.5 rounded', cls)}>
      {verdict.replace('_', ' ')}
    </span>
  )
}

// ── ToolCard ──────────────────────────────────────────────────────────────────

function ToolCard({
  tool, ts, onRun, onOpenCandidates, onPromote,
}: {
  tool: EITool
  ts: EIToolState
  onRun: (id: EIToolId) => void
  onOpenCandidates: () => void
  onPromote: (email: string, tier: string) => void
}) {
  const meta    = TOOL_META[tool.id]
  const Icon    = meta.icon
  const isRunning = ts.state === 'running'
  const result    = ts.result
  const foundEmail = result
    ? ((result.email as string) || (result.data as Record<string, unknown>)?.email as string) ?? null
    : null
  const verdict = result ? ((result.verdict as string) || (result.status as string) || null) : null

  return (
    <div className={cn(
      'bg-white dark:bg-neutral-900 rounded-2xl border overflow-hidden transition-colors',
      ts.state === 'running' ? 'border-blue-200 dark:border-blue-800'
        : ts.state === 'done' && !result?.error ? 'border-green-200 dark:border-emerald-800'
        : ts.state === 'error' ? 'border-red-200 dark:border-red-800'
        : 'border-gray-200 dark:border-neutral-700',
    )}>
      {/* Card body */}
      <div className="p-5">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{tool.name}</span>
            {tool.available
              ? <BadgeCheck className="h-6 w-6 text-white fill-blue-500 flex-shrink-0" />
              : <span className="text-xs text-slate-400 dark:text-slate-500 border border-gray-200 dark:border-neutral-700 rounded-full px-2 py-0.5">Unavailable</span>}
          </div>
          <MoreHorizontal className="h-4 w-4 text-slate-700 dark:text-slate-500 flex-shrink-0" />
        </div>

        {/* Content row: left info + right action */}
        <div className="flex items-start gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-700 dark:text-slate-400 leading-relaxed mb-3">{meta.description}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-500">
              <Icon className="h-3.5 w-3.5" />
              <span>{meta.engineBadge}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={cn(
              'text-xs',
              meta.isFree
                ? 'font-normal text-slate-600 dark:text-slate-400'
                : 'font-semibold text-slate-800 dark:text-slate-400',
            )}>
              {meta.isFree ? 'Free' : meta.costLabel.split('·')[0].trim()}
            </span>

            {tool.id === 'pattern_candidates' ? (
              <button
                onClick={onOpenCandidates}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Open
              </button>
            ) : isRunning ? (
              <button disabled className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-400 cursor-not-allowed">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </button>
            ) : (
              <button
                onClick={() => onRun(tool.id)}
                disabled={!tool.available}
                title={tool.unavailable_reason ?? undefined}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 dark:disabled:bg-neutral-700 disabled:text-slate-400 dark:disabled:text-slate-500 transition-colors"
              >
                {ts.state === 'done'
                  ? <RefreshCw className="h-3.5 w-3.5 text-white" />
                  : <Play className="h-3.5 w-3.5 text-white" />}
              </button>
            )}
          </div>
        </div>

        {/* Constraint / availability note */}
        {!tool.available && tool.unavailable_reason && (
          <p className="mt-2.5 text-xs text-slate-400 dark:text-slate-500">{tool.unavailable_reason}</p>
        )}
        {tool.available && !meta.isFree && (
          <p className="mt-2.5 text-xs text-slate-400 dark:text-slate-500">{meta.costLabel}</p>
        )}
      </div>

      {/* Result row */}
      {ts.state === 'done' && result && (
        <div className={cn(
          'border-t px-5 py-3',
          result.error
            ? 'bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900'
            : 'bg-gray-50 dark:bg-neutral-800 border-gray-100 dark:border-neutral-700',
        )}>
          {result.error ? (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {String(result.error)}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {foundEmail && <MonoEmail email={foundEmail} />}
                {verdict && <VerdictChip verdict={verdict} />}
                {result.score != null && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Score: {String(result.score)}/100</span>
                )}
              </div>
              {foundEmail && !result.error && (
                <button
                  onClick={() => onPromote(foundEmail, (result.verification_tier as string) || 'inferred')}
                  className="h-7 px-3 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                >
                  <ArrowUpCircle className="h-3 w-3" />
                  Promote
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {ts.state === 'running' && (
        <div className="border-t border-blue-100 dark:border-blue-900 px-5 py-3 bg-blue-50 dark:bg-blue-950/40 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
          Running {tool.name}…
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-neutral-800 px-5 py-2.5 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
        <span>More about tool</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

// ── CandidatesTab ─────────────────────────────────────────────────────────────

function CandidatesTab({
  contact, candidates, setCandidates, generating, setGenerating, onPromote,
}: {
  contact: Contact
  candidates: EICandidate[]
  setCandidates: (c: EICandidate[]) => void
  generating: boolean
  setGenerating: (v: boolean) => void
  onPromote: (email: string, tier: string) => void
}) {
  const { first, last } = parseName(contact.name)

  const generateCandidates = useCallback(async () => {
    setGenerating(true)
    try {
      const { data } = await api.post(`/contacts/${contact.id}/email-intelligence/run`, { tool: 'pattern_candidates' })
      const taskId = data.task_id
      let attempts = 0
      const poll = async () => {
        try {
          const { data: s } = await api.get(`/contacts/${contact.id}/email-intelligence/run/status/${taskId}`)
          if (s.state === 'SUCCESS') {
            const emails: string[] = s.result?.candidates ?? []
            setCandidates(emails.map((email, i) => ({
              email, pattern: patternForEmail(email, first, last), rank: i + 1,
              smtpVerdict: null, zbVerdict: null, probing: false,
            })))
            setGenerating(false); return
          }
          if (s.state === 'FAILURE') { setGenerating(false); return }
        } catch { /* ignore */ }
        if (++attempts < 60) setTimeout(poll, 2000)
        else setGenerating(false)
      }
      setTimeout(poll, 2000)
    } catch { setGenerating(false) }
  }, [contact.id, first, last, setCandidates, setGenerating])

  const probeCandidate = useCallback(async (idx: number) => {
    const cand = candidates[idx]
    if (!cand || cand.probing) return
    setCandidates(candidates.map((c, i) => i === idx ? { ...c, probing: true } : c))
    try {
      const { data } = await api.post(`/contacts/${contact.id}/email-intelligence/run`, { tool: 'smtp_probe', candidate_email: cand.email })
      const taskId = data.task_id
      let attempts = 0
      const poll = async () => {
        try {
          const { data: s } = await api.get(`/contacts/${contact.id}/email-intelligence/run/status/${taskId}`)
          if (s.state === 'SUCCESS') {
            const verdict = s.result?.verdict as string | null
            setCandidates(candidates.map((c, i) => i === idx ? { ...c, smtpVerdict: verdict ?? 'unknown', probing: false } : c))
            return
          }
          if (s.state === 'FAILURE') { setCandidates(candidates.map((c, i) => i === idx ? { ...c, probing: false } : c)); return }
        } catch { /* ignore */ }
        if (++attempts < 30) setTimeout(poll, 2000)
        else setCandidates(candidates.map((c, i) => i === idx ? { ...c, probing: false } : c))
      }
      setTimeout(poll, 2000)
    } catch { setCandidates(candidates.map((c, i) => i === idx ? { ...c, probing: false } : c)) }
  }, [candidates, contact.id, setCandidates])

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Pattern Candidates</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          34 North American corporate format candidates for{' '}
          <strong className="text-slate-700 dark:text-slate-300 font-medium">{contact.name}</strong>{' '}
          at <span className="text-blue-600 text-sm">{contact.lead_domain ?? ''}</span>.
          SMTP-probe any candidate for free before spending ZeroBounce credits.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={generateCandidates}
          disabled={generating}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {candidates.length > 0 ? 'Regenerate All' : 'Generate All 34'}
        </button>
        {candidates.length > 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">{candidates.length} candidates</span>
        )}
      </div>

      {candidates.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold  text-slate-500 dark:text-slate-400 w-8">#</th>
                  <th className="py-3 px-4 text-xs font-semibold  text-slate-500 dark:text-slate-400">Email</th>
                  <th className="py-3 px-4 text-xs font-semibold  text-slate-500 dark:text-slate-400">Pattern</th>
                  <th className="py-3 px-4 text-xs font-semibold  text-slate-500 dark:text-slate-400">SMTP</th>
                  <th className="py-3 px-4 text-xs font-semibold  text-slate-500 dark:text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand, idx) => (
                  <tr key={cand.email} className="border-b border-gray-100 dark:border-neutral-800 last:border-none hover:bg-gray-50/50 dark:hover:bg-neutral-800/50">
                    <td className="py-2.5 px-4">
                      <span className={cn(
                        'inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold',
                        idx < 3
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                          : 'bg-gray-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400',
                      )}>{cand.rank}</span>
                    </td>
                    <td className="py-2.5 px-4"><MonoEmail email={cand.email} /></td>
                    <td className="py-2.5 px-4">
                      <code className="text-xs bg-gray-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">{cand.pattern}</code>
                    </td>
                    <td className="py-2.5 px-4">
                      {cand.probing
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        : <VerdictChip verdict={cand.smtpVerdict} />}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        {!cand.smtpVerdict && (
                          <button
                            onClick={() => probeCandidate(idx)}
                            disabled={cand.probing}
                            className="h-6 px-2.5 text-xs font-semibold rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                          >
                            Probe
                          </button>
                        )}
                        <button
                          onClick={() => onPromote(cand.email, cand.smtpVerdict === 'valid' ? 'probable' : 'inferred')}
                          className="h-6 px-2.5 text-xs font-semibold rounded border border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-400 hover:bg-green-100 dark:hover:bg-emerald-950/60 transition-colors"
                        >
                          Promote
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {candidates.length === 0 && !generating && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700">
          <List className="h-8 w-8 mx-auto mb-3 opacity-30" />
          Click &quot;Generate All 34&quot; to run Qwen3 pattern generation
        </div>
      )}
    </div>
  )
}

// ── LeadOverviewPanel ─────────────────────────────────────────────────────────

function OverviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs mb-1 text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{value}</span>
    </div>
  )
}

const PRIORITY_CONFIG: Record<number, { label: string; Icon: ElementType; color: string }> = {
  1: { label: 'Top',    Icon: CircleFadingArrowUp, color: 'text-orange-500' },
  2: { label: 'High',   Icon: Goal,               color: 'text-amber-500'  },
  3: { label: 'Medium', Icon: CalendarClock,       color: 'text-blue-400'  },
}
const DEFAULT_PRIORITY = { label: 'Low', Icon: CircleDashed, color: 'text-slate-400' }

function priorityDisplay(rank: number) {
  return rank > 0 ? (PRIORITY_CONFIG[rank] ?? DEFAULT_PRIORITY) : null
}

function LeadOverviewPanel({ contact }: { contact: Contact }) {
  const bestEmail = contact.email || contact.ai_inferred_email

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl sticky top-4">
      <div className="px-5 pt-5 pb-1">
        <p className="text-sm font-semibold  text-slate-800 dark:text-slate-500 mb-6">Account Information</p>
      </div>

      <div className="px-5 pb-4">
        <div className="space-y-4">
          {/* Row 1: Buying role | divider | Industry */}
          <div className="grid grid-cols-2">
            <OverviewRow label="Buying role" value={<span className="capitalize">{contact.buying_role.replace(/_/g, ' ')}</span>} />
            <div className="flex gap-4">
              <div className="w-px bg-gray-100 dark:bg-neutral-700 self-stretch" />
              <OverviewRow label="Industry" value={contact.lead_vertical
                ? <span className="capitalize">{contact.lead_vertical.replace(/_/g, ' ')}</span>
                : contact.lead_industry || '—'} />
            </div>
          </div>
          <OverviewRow label="Company Name" value={
            <div className="flex items-center gap-1.5">
              {contact.lead_domain && (
                <CompanyAvatar domain={contact.lead_domain} name={contact.lead_name || ''} size="xxs" />
              )}
              <span>{contact.lead_name || '—'}</span>
            </div>
          } />
          <OverviewRow label="Priority" value={(() => {
            const p = priorityDisplay(contact.priority_rank)
            if (!p) return '—'
            return (
              <span className={`flex items-center gap-1 ${p.color}`}>
                <p.Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">{p.label}</span>
              </span>
            )
          })()} />
          <OverviewRow label="Headcount" value={contact.lead_employee_count ? contact.lead_employee_count.toLocaleString() : '—'} />
          <OverviewRow label="HQ" value={
            [contact.lead_hq_city, contact.lead_hq_state].filter(Boolean).join(', ') || '—'
          } />
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">Email Record</p>
        <OverviewRow label="Address" value={bestEmail
          ? <MonoEmail email={bestEmail} />
          : <span className="text-slate-400 dark:text-slate-500">None</span>} />
        <OverviewRow label="Tier" value={
          <span className={cn('inline-flex text-xs font-normal px-2 py-0.5 rounded-full', tierChipCls(contact.verification_tier))}>
            {tierLabel(contact.verification_tier)}
          </span>
        } />
        <OverviewRow label="ZeroBounce" value={
          <span className={contact.verified_with_zerobounce ? 'text-green-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}>
            {contact.verified_with_zerobounce
              ? `Validated${contact.zb_verified_at ? ` · ${new Date(contact.zb_verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`
              : 'Not run'}
          </span>
        } />
        <OverviewRow label="Updated" value={contact.modified
          ? new Date(contact.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—'} />
      </div>
    </div>
  )
}

// ── OverviewRightPanel ────────────────────────────────────────────────────────

function OverviewRightPanel({ contact, onTabChange }: { contact: Contact; onTabChange: (t: EITab) => void }) {
  const tier = contact.verification_tier || 'not_found'

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email Status</h3>
        <p className="text-xs text-slate-700 dark:text-slate-400 mt-0.5">Current email intelligence state for this contact.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Email Tier',
            value: <span className={cn('inline-flex -ml-1 text-xs font-semibold px-2.5 py-1 rounded-full', tierChipCls(tier))}>{tierLabel(tier)}</span>,
            sub: 'Current confidence',
          },
          {
            label: 'ZeroBounce',
            value: contact.verified_with_zerobounce
              ? <span className="text-green-600 dark:text-emerald-400 font-semibold text-sm">Validated</span>
              : <span className="text-slate-400 dark:text-slate-500 text-sm">Not run</span>,
            sub: contact.zb_verified_at
              ? new Date(contact.zb_verified_at).toLocaleDateString()
              : 'No record',
          },
          {
            label: 'Resolvable',
            value: contact.resolvable
              ? <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">Yes</span>
              : <span className="text-green-600 dark:text-emerald-400 font-semibold text-sm">No</span>,
            sub: contact.resolvable ? 'Better email may exist' : 'Email looks good',
          },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 px-4 py-4">
            <p className="text-xs text-slate-900 font-semibold dark:text-slate-400 mb-2">{s.label}</p>
            <div className="mb-1">{s.value}</div>
            <p className="text-xs text-slate-600 dark:text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <p className="text-xs font-semibold  text-slate-400 dark:text-slate-500 mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onTabChange('tools')} className="h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
            <Shield className="h-3.5 w-3.5" />ZeroBounce Validate
          </button>
          <button onClick={() => onTabChange('tools')} className="h-9 px-4 text-sm font-medium bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-lg flex items-center gap-2 transition-colors">
            <Radio className="h-3.5 w-3.5" />SMTP Probe
          </button>
          <button onClick={() => onTabChange('tools')} className="h-9 px-4 text-sm font-medium bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-lg flex items-center gap-2 transition-colors">
            <Crosshair className="h-3.5 w-3.5" />Hunter Find Email
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

const TOOL_ORDER: EIToolId[] = [
  'local_discover', 'hunter', 'zerobounce_find', 'smtp_probe', 'zerobounce_validate', 'pattern_candidates',
]

export function EmailIntelligencePanel({
  contact,
  onClose,
  onContactUpdated,
}: {
  contact: Contact
  onClose: () => void
  onContactUpdated: (c: Contact) => void
}) {
  const [tab,             setTab]            = useState<EITab>('tools')
  const [tools,           setTools]          = useState<EITool[]>([])
  const [toolStates,      setToolStates]     = useState<Record<EIToolId, EIToolState>>({} as Record<EIToolId, EIToolState>)
  const [candidates,      setCandidates]     = useState<EICandidate[]>([])
  const [generatingCands, setGeneratingCands] = useState(false)
  const [promoting,       setPromoting]      = useState(false)
  const [dismissed,       setDismissed]      = useState(false)

  const pollRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    api.get(`/contacts/${contact.id}/email-intelligence`).then(({ data }) => {
      const toolList: EITool[] = data.tools
      setTools(toolList)
      const states = {} as Record<EIToolId, EIToolState>
      for (const t of toolList) states[t.id] = initToolState(t.id)
      setToolStates(states)
    })
  }, [contact.id])

  const updateToolState = useCallback((toolId: EIToolId, patch: Partial<EIToolState>) => {
    setToolStates(prev => ({ ...prev, [toolId]: { ...prev[toolId], ...patch } }))
  }, [])

  const pollTask = useCallback((toolId: EIToolId, taskId: string) => {
    let attempts = 0
    const tick = async () => {
      try {
        const { data } = await api.get(`/contacts/${contact.id}/email-intelligence/run/status/${taskId}`)
        if (data.state === 'SUCCESS') { updateToolState(toolId, { state: 'done', result: data.result ?? {} }); return }
        if (data.state === 'FAILURE') { updateToolState(toolId, { state: 'error', error: data.error ?? 'Failed' }); return }
      } catch { /* ignore */ }
      if (++attempts < 60) pollRefs.current[toolId] = setTimeout(tick, 2500)
      else updateToolState(toolId, { state: 'error', error: 'Timed out' })
    }
    pollRefs.current[toolId] = setTimeout(tick, 2000)
  }, [contact.id, updateToolState])

  useEffect(() => () => { Object.values(pollRefs.current).forEach(clearTimeout) }, [])

  const runTool = useCallback(async (toolId: EIToolId) => {
    updateToolState(toolId, { state: 'running', result: null, error: null, startedAt: Date.now() })
    try {
      const { data } = await api.post(`/contacts/${contact.id}/email-intelligence/run`, { tool: toolId })
      pollTask(toolId, data.task_id)
    } catch (e: unknown) {
      updateToolState(toolId, { state: 'error', error: e instanceof Error ? e.message : 'Request failed' })
    }
  }, [contact.id, pollTask, updateToolState])

  const promoteEmail = useCallback(async (email: string, tier: string) => {
    if (promoting) return
    setPromoting(true)
    try {
      const { data } = await api.post(`/contacts/${contact.id}/email-intelligence/promote`, {
        email, verification_tier: tier, source: 'admin_ei_panel',
      })
      onContactUpdated(data.contact)
    } catch { /* ignore */ }
    setPromoting(false)
  }, [contact.id, promoting, onContactUpdated])

  const hasVerifiedEmail = contact.verification_tier === 'verified' && !!contact.email
  const showWarning      = !dismissed && !hasVerifiedEmail

  const TABS = [
    { id: 'overview' as EITab, label: 'Overview' },
    { id: 'tools' as EITab,    label: 'Tools' },
    { id: 'candidates' as EITab, label: 'Candidates' },
    { id: 'history' as EITab,  label: 'History' },
  ]

  return (
    <div className="min-h-full bg-[#f9fafb] dark:bg-neutral-950">
      {/* ── White header card — no shadow, no borders ── */}
      <div className="bg-white dark:bg-neutral-900">

        {/* Banner */}
        <div className="h-52 relative" style={{ backgroundImage: 'url(/herobg.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        </div>

        <div className="px-8">

          {/* Row 1: Avatar (left, overlaps banner) + Status & Action (right, in white area) */}
          <div className="flex items-start justify-between mb-5">

            {/* Avatar — -mt-14 keeps ~56% inside banner, 44% in white area */}
            <div className="relative flex-shrink-0 -mt-12">
              <Avatar
                name={contact.name}
                email={contact.email}
                size="2xl"
                className="ring-4 ring-white dark:ring-neutral-900"
              />
              <div className="absolute bottom-1 right-1 w-[26px] h-[26px] bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-neutral-900">
                <BadgeCheck className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Status indicator + action button */}
            <div className="flex items-center gap-3 pt-3">
              <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border border-slate-400 dark:border-neutral-600 text-slate-600 dark:text-slate-400">
                {contact.verification_tier === 'verified'
                  ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                {contact.verification_tier === 'verified' ? 'Email verified' : 'Email not verified'}
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-sm font-normal px-4 py-1.5 rounded-full bg-blue-200 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-blue-600 dark:text-blue-900 transition-colors"
              >
                Open contacts →
              </button>
            </div>
          </div>

          {/* Row 2: Name + subtitle */}
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 mt-6 leading-tight tracking-tight">{contact.name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {contact.title}{contact.lead_name ? ` · ${contact.lead_name}` : ''}
            </p>
          </div>

          {/* Row 3: Chips (left) + Social icons (right) */}
          <div className="flex items-center justify-between pb-5">
            <div className="flex items-center gap-2.5 flex-wrap">

              {contact.modified && (
                <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-600 dark:text-slate-400 border-2 border-blue-500 dark:border-neutral-700 rounded-full px-3 py-1.5">
                  <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  {new Date(contact.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}

              <div className={cn('text-xs text-red-600 font-semibold rounded-full px-3 py-1.5', tierChipCls(contact.verification_tier))}>
                {tierLabel(contact.verification_tier)}
              </div>

              <div className="text-xs text-slate-800 dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-full px-3 py-1.5 capitalize">
                {contact.buying_role.replace(/_/g, ' ')}
              </div>

            </div>

            {/* Domain + Social icons — right side of chips row */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {contact.lead_domain && (
                <div className="text-xs text-slate-900 font-semibold dark:text-slate-300 border border-gray-200 dark:border-neutral-700 rounded-full px-3.5 py-2">{contact.lead_domain}</div>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} title={contact.email} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-neutral-700 text-slate-800 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors">
                  <Mail className="h-3 w-3" />
                </a>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-neutral-700 text-slate-800 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors">
                  <LinkedInIcon className="h-3 w-3" />
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} title={contact.phone} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-neutral-700 text-slate-800 dark:text-slate-300 hover:text-green-600 dark:hover:text-emerald-400 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors">
                  <Phone className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Tab bar — no border */}
          <div className="flex">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'px-5 py-3 text-sm font-normal relative transition-colors',
                  tab === id ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                {label}
                {tab === id && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 dark:bg-slate-100 rounded-t" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[346px_1fr] gap-6">

          {/* Left: Lead Overview (persistent) */}
          <div>
            <LeadOverviewPanel contact={contact} />
          </div>

          {/* Right: Tab content */}
          <div>
            {/* Warning */}
            {showWarning && (
              <div className="mb-5 flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-amber-800 rounded-xl">
                <TriangleAlert className="h-4 w-4 text-stone-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="flex-1 text-xs text-slate-600 dark:text-amber-300 leading-relaxed">
                  <strong>No verified email on record.</strong> The current address is {tierLabel(contact.verification_tier).toLowerCase()} — unconfirmed by SMTP or ZeroBounce.
                </p>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-xs font-semibold text-stone-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex-shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <OverviewRightPanel contact={contact} onTabChange={setTab} />
            )}

            {/* TOOLS */}
            {tab === 'tools' && (
              <div>
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email Intelligence</h3>
                  <p className="text-xs text-slate-800 dark:text-slate-400 mt-0.5">
                    Run tools individually results are read-only until you promote one to this contact.
                  </p>
                </div>
                <div className="space-y-4">
                  {TOOL_ORDER.map(toolId => {
                    const tool = tools.find(t => t.id === toolId)
                    if (!tool) return null
                    return (
                      <ToolCard
                        key={toolId}
                        tool={tool}
                        ts={toolStates[toolId] ?? initToolState(toolId)}
                        onRun={runTool}
                        onOpenCandidates={() => setTab('candidates')}
                        onPromote={promoteEmail}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* CANDIDATES */}
            {tab === 'candidates' && (
              <CandidatesTab
                contact={contact}
                candidates={candidates}
                setCandidates={setCandidates}
                generating={generatingCands}
                setGenerating={setGeneratingCands}
                onPromote={promoteEmail}
              />
            )}

            {/* HISTORY */}
            {tab === 'history' && (
              <div>
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">History</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Audit trail of email intelligence actions run on this contact.</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  History logging coming in a future phase
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Promote toast */}
      {promoting && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 px-5 py-3 shadow-xl">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Promoting email…</span>
        </div>
      )}
    </div>
  )
}
