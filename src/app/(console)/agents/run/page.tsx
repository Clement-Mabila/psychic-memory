'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, Zap, Globe, Server,
  AlertTriangle, AlertCircle, Loader2,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveEvent {
  id:         number
  lead_id:    string
  lead_name:  string
  agent_type: string
  event_type: string
  level:      string
  label:      string | null
  created_at: string
}

// ── Styling maps ──────────────────────────────────────────────────────────────

const LEVEL_TEXT: Record<string, string> = {
  info:    'text-slate-300',
  debug:   'text-slate-600',
  warning: 'text-amber-400',
  error:   'text-red-400',
}

const LEVEL_DOT: Record<string, string> = {
  info:    'bg-slate-500',
  debug:   'bg-slate-700',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
}

const AGENT_COLOR: Record<string, string> = {
  research:             'text-purple-400',
  contact:              'text-pink-400',
  enrichment:           'text-orange-400',
  qualification:        'text-emerald-400',
  company_intel:        'text-sky-400',
  handoff:              'text-teal-400',
  discovery:            'text-indigo-400',
  research_critic:      'text-violet-400',
  contact_critic:       'text-rose-400',
  enrichment_critic:    'text-amber-400',
  qualification_critic: 'text-cyan-400',
  supervisor_critic:    'text-fuchsia-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 8)
}

function fmtCost(n: number | null): string {
  if (n == null || n === 0) return '—'
  return `$${n.toFixed(4)}`
}

function fmtK(n: number | null): string {
  if (n == null || n === 0) return '—'
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

// ── Log line ──────────────────────────────────────────────────────────────────

function LogLine({ event, isNew }: { event: LiveEvent; isNew: boolean }) {
  const agentColor = AGENT_COLOR[event.agent_type] ?? 'text-slate-500'
  const levelColor = LEVEL_TEXT[event.level]       ?? 'text-slate-400'
  const dotColor   = LEVEL_DOT[event.level]        ?? 'bg-slate-700'
  const label      = event.label ?? event.event_type.replace(/_/g, ' ')

  return (
    <div className={cn(
      'flex items-start gap-2.5 px-4 py-[3px] font-mono text-[11px] leading-[18px] transition-colors duration-700',
      isNew && 'bg-white/[0.04]',
    )}>
      <span className="text-neutral-700 shrink-0 tabular-nums select-none">{fmtTime(event.created_at)}</span>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]', dotColor)} />
      <span className="text-slate-600 shrink-0 w-[130px] truncate">{event.lead_name}</span>
      <span className={cn('shrink-0 w-[110px] truncate', agentColor)}>{event.agent_type}</span>
      <span className={cn('flex-1 min-w-0 break-words', levelColor)}>{label}</span>
    </div>
  )
}

// ── Log stream (left 60%) ─────────────────────────────────────────────────────

function LogStream() {
  const eventsMapRef = useRef<Map<number, LiveEvent>>(new Map())
  const lastIdsRef   = useRef<Record<string, number>>({})
  const fetchingRef  = useRef(false)

  const [events, setEvents] = useState<LiveEvent[]>([])
  const [newIds, setNewIds] = useState<Set<number>>(new Set())
  const [paused, setPaused] = useState(false)
  const bottomRef           = useRef<HTMLDivElement>(null)

  const tick = async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const { data: activeData } = await api.get('/agents/active')
      const active: any[] = activeData.active ?? []
      if (active.length === 0) return

      // Build leadId → leadName map from active executions
      const leadMap: Record<string, string> = {}
      active.forEach(a => { if (a.lead_id) leadMap[a.lead_id] = a.lead_name ?? a.lead_id })
      const leadIds = Object.keys(leadMap)

      const added: number[] = []
      await Promise.all(leadIds.map(async (leadId) => {
        const sinceId = lastIdsRef.current[leadId] ?? 0
        try {
          const { data } = await api.get(`/leads/${leadId}/events`, { params: { since_id: sinceId } })
          const newEvents: any[] = data.events ?? []
          const lastId: number   = data.last_id ?? sinceId
          newEvents.forEach(e => {
            if (!eventsMapRef.current.has(e.id)) {
              eventsMapRef.current.set(e.id, {
                ...e,
                lead_id:   leadId,
                lead_name: leadMap[leadId],
              })
              added.push(e.id)
            }
          })
          if (lastId > sinceId) lastIdsRef.current[leadId] = lastId
        } catch { /* silent — worker may not have events yet */ }
      }))

      if (added.length > 0) {
        const sorted = [...eventsMapRef.current.values()].sort((a, b) => a.id - b.id)
        setEvents(sorted)
        setNewIds(new Set(added))
        setTimeout(() => setNewIds(new Set()), 1500)
      }
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    tick()
    const id = setInterval(tick, 2500)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll on new events
  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length, paused])

  const warnCount  = events.filter(e => e.level === 'warning').length
  const errorCount = events.filter(e => e.level === 'error').length

  return (
    <div className="flex flex-col h-full bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800">

      {/* Terminal title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* macOS traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/50" />
            <span className="w-3 h-3 rounded-full bg-amber-500/50" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/50" />
          </div>
          <span className="text-[11px] font-mono text-neutral-500">mbody-pipeline — agent stream</span>
          {events.length > 0 && (
            <span className="text-[10px] text-neutral-700 font-mono">{events.length} events</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
              <AlertCircle size={10} /> {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
              <AlertTriangle size={10} /> {warnCount} warn{warnCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => setPaused(p => !p)}
            className={cn(
              'text-[10px] px-2 py-0.5 rounded border font-mono transition-colors',
              paused
                ? 'bg-amber-950/40 text-amber-400 border-amber-800'
                : 'text-neutral-600 border-neutral-700 hover:text-neutral-400 hover:border-neutral-600',
            )}
          >
            {paused ? '▶ resume' : '⏸ pause'}
          </button>
        </div>
      </div>

      {/* Column header */}
      <div className="flex items-center gap-2.5 px-4 py-1 bg-neutral-900/60 border-b border-neutral-800/40 flex-shrink-0">
        <span className="text-[9px] text-neutral-700 font-mono w-[58px] shrink-0 uppercase tracking-wide">time</span>
        <span className="w-1.5 shrink-0" />
        <span className="text-[9px] text-neutral-700 font-mono w-[130px] shrink-0 uppercase tracking-wide">lead</span>
        <span className="text-[9px] text-neutral-700 font-mono w-[110px] shrink-0 uppercase tracking-wide">agent</span>
        <span className="text-[9px] text-neutral-700 font-mono flex-1 uppercase tracking-wide">event</span>
      </div>

      {/* Scrollable log area */}
      <div className="flex-1 overflow-y-auto py-1">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-700">
            <Loader2 size={18} className="animate-spin" />
            <p className="text-xs font-mono">waiting for active agents…</p>
            <p className="text-[10px] font-mono text-neutral-800">events appear when the pipeline is running</p>
          </div>
        ) : (
          events.map(e => (
            <LogLine key={e.id} event={e} isNew={newIds.has(e.id)} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── Resources panel (right 40%) ───────────────────────────────────────────────

function ResourcesPanel() {
  const { data: activeData } = useQuery({
    queryKey: ['run-active'],
    queryFn:  () => api.get('/agents/active').then(r => r.data),
    refetchInterval: 3_000,
    staleTime:       2_000,
  })

  const { data: costsData } = useQuery({
    queryKey: ['run-costs'],
    queryFn:  () => api.get('/costs?period=today').then(r => r.data),
    refetchInterval: 30_000,
    staleTime:       25_000,
  })

  const active: any[]   = activeData?.active ?? []
  const claude          = costsData?.claude ?? null
  const services: any[] = costsData?.external_services ?? []
  const hunter          = services.find((s: any) => s.name === 'Hunter.io')
  const zerobounce      = services.find((s: any) => s.name === 'ZeroBounce')

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-0.5">

      {/* ── Active Agents ── */}
      <div className="bg-neutral-900 dark:bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={13} className="text-blue-400" />
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Active Agents</h3>
          {active.length > 0 && (
            <span className="ml-auto text-[10px] bg-blue-950/60 text-blue-400 border border-blue-900 px-1.5 py-0.5 rounded-full font-mono">
              {active.length} running
            </span>
          )}
        </div>

        {active.length === 0 ? (
          <div className="flex items-center gap-2 py-2">
            <span className="w-2 h-2 rounded-full bg-neutral-700 shrink-0" />
            <p className="text-[11px] text-neutral-600 font-mono">no active tasks</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2.5 py-1.5 border-b border-neutral-800 last:border-0">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-slate-300 truncate">{a.agent_type}</p>
                  <p className="text-[10px] text-neutral-600 truncate">{a.lead_name}</p>
                </div>
                <span className="text-[10px] text-neutral-700 shrink-0 font-mono">
                  {a.created ? formatRelativeTime(a.created) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Claude API — Today ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={13} className="text-violet-400" />
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Claude API · Today</h3>
        </div>

        {!claude ? (
          <p className="text-[11px] text-neutral-600 font-mono">loading…</p>
        ) : (
          <div className="space-y-3">
            {/* Cost + calls */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Cost',  value: fmtCost(claude.total_cost_usd) },
                { label: 'Calls', value: String(claude.total_calls ?? '—') },
              ].map(m => (
                <div key={m.label} className="bg-neutral-800/60 rounded-xl px-3 py-2">
                  <p className="text-[9px] text-neutral-600 mb-0.5 uppercase tracking-wide">{m.label}</p>
                  <p className="text-sm font-semibold text-slate-200 font-mono">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Tokens */}
            {claude.token_breakdown && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Tokens in',  value: fmtK(claude.token_breakdown.input) },
                  { label: 'Tokens out', value: fmtK(claude.token_breakdown.output) },
                ].map(m => (
                  <div key={m.label} className="bg-neutral-800/60 rounded-xl px-3 py-2">
                    <p className="text-[9px] text-neutral-600 mb-0.5 uppercase tracking-wide">{m.label}</p>
                    <p className="text-sm font-semibold text-slate-200 font-mono">{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* By model */}
            {(claude.by_model?.length ?? 0) > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[9px] text-neutral-700 uppercase tracking-widest">By model</p>
                {claude.by_model.map((m: any) => (
                  <div key={m.model_id} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">{m.label}</span>
                      <span className="text-[10px] text-neutral-700 font-mono">{m.pct}%</span>
                    </div>
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-600/60 rounded-full transition-all duration-700"
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* By agent — top 3 */}
            {(claude.by_agent?.length ?? 0) > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[9px] text-neutral-700 uppercase tracking-widest">By agent (top 3)</p>
                {claude.by_agent.slice(0, 3).map((a: any) => (
                  <div key={a.agent_type} className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-mono w-28 truncate shrink-0', AGENT_COLOR[a.agent_type] ?? 'text-slate-500')}>
                      {a.agent_type}
                    </span>
                    <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600/70 rounded-full"
                        style={{ width: `${a.pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-700 font-mono w-10 text-right shrink-0">
                      {fmtCost(a.cost_usd)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── External Services ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={13} className="text-emerald-400" />
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Services</h3>
        </div>

        {!hunter && !zerobounce ? (
          <p className="text-[11px] text-neutral-600 font-mono">loading…</p>
        ) : (
          <div className="space-y-4">
            {/* Hunter.io */}
            {hunter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">Hunter.io</span>
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wide',
                    hunter.status === 'ok'
                      ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-900'
                      : 'text-red-400 bg-red-950/50 border border-red-900',
                  )}>
                    {hunter.status}
                  </span>
                </div>
                {hunter.searches && (
                  <div className="space-y-1.5">
                    <ServiceBar
                      label="searches"
                      used={hunter.searches.used}
                      total={hunter.searches.total}
                      pct={hunter.searches.pct_used}
                      color="bg-sky-600/60"
                    />
                    {hunter.verifications && (
                      <ServiceBar
                        label="verif."
                        used={hunter.verifications.used}
                        total={hunter.verifications.total}
                        pct={hunter.verifications.pct_used}
                        color="bg-sky-700/50"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ZeroBounce */}
            {zerobounce && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">ZeroBounce</span>
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wide',
                    zerobounce.status === 'ok'
                      ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-900'
                      : 'text-red-400 bg-red-950/50 border border-red-900',
                  )}>
                    {zerobounce.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-200 font-mono">
                  {zerobounce.credits_available?.toLocaleString() ?? '—'}
                  <span className="text-[10px] text-neutral-600 font-normal ml-1">credits</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Worker heartbeat ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={13} className="text-neutral-600" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Worker</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-2 h-2 rounded-full',
              active.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-700',
            )} />
            <span className="text-[10px] text-neutral-600 font-mono">
              {active.length > 0
                ? `${active.length} task${active.length > 1 ? 's' : ''} in flight`
                : 'idle'}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Service progress bar helper ───────────────────────────────────────────────

function ServiceBar({ label, used, total, pct, color }: {
  label: string; used: number; total: number; pct: number; color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-neutral-600 font-mono w-24 text-right shrink-0">
        {used.toLocaleString()}/{total.toLocaleString()} {label}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveRunPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-h,130px))] px-5 pb-5 pt-3 gap-3">

      {/* Page title */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Live Run</h1>
        <span className="text-xs text-slate-400 dark:text-slate-500">real-time agent event stream · 2.5s refresh</span>
      </div>

      {/* 60 / 40 split */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Logs — 60% */}
        <div className="flex-[3] min-w-0 min-h-0">
          <LogStream />
        </div>

        {/* Resources — 40% */}
        <div className="flex-[2] min-w-0 min-h-0 overflow-y-auto">
          <ResourcesPanel />
        </div>

      </div>
    </div>
  )
}
