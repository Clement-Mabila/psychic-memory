'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Loader2, Circle, Octagon, Pentagon, Squircle, Aperture, Atom,
  AlertTriangle, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'

// ── Agent icon lookup ─────────────────────────────────────────────────────────

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
  unknown:              { icon: Circle,    color: 'text-gray-400 dark:text-slate-500'    },
}

// ── Level styling ─────────────────────────────────────────────────────────────

const LEVEL_TEXT: Record<string, string> = {
  info:    'text-slate-700 dark:text-slate-300',
  debug:   'text-slate-400 dark:text-slate-500',
  warning: 'text-amber-600 dark:text-amber-400',
  error:   'text-red-600 dark:text-red-400',
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event, isNew }: { event: any; isNew: boolean }) {
  const { icon: AgentIcon, color } = AGENT_META[event.agent_type] ?? AGENT_META.unknown

  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-2.5 border-b border-slate-50 dark:border-slate-800 transition-colors duration-700',
      isNew && 'bg-blue-50 dark:bg-blue-950/30'
    )}>
      <AgentIcon size={12} className={cn('flex-shrink-0 mt-0.5', color)} strokeWidth={1.75} />

      <p className={cn('flex-1 text-xs leading-snug min-w-0', LEVEL_TEXT[event.level] ?? 'text-slate-600 dark:text-slate-400')}>
        {event.label ?? event.event_type.replace(/_/g, ' ')}
        {event.level === 'error' && event.payload?.error && (
          <span className="block text-[10px] text-red-400 mt-0.5 truncate">
            {String(event.payload.error).slice(0, 120)}
          </span>
        )}
      </p>

      <span className="text-[10px] text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5 whitespace-nowrap">
        {formatRelativeTime(event.created_at)}
      </span>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface LiveRunPanelProps {
  leadId: string
  leadName: string
  onClose: () => void
}

export function LiveRunPanel({ leadId, leadName, onClose }: LiveRunPanelProps) {
  const eventsMapRef = useRef<Map<number, any>>(new Map())
  const lastIdRef    = useRef(0)
  const fetchingRef  = useRef(false)

  const [events, setEvents] = useState<any[]>([])
  const [lastId, setLastId] = useState(0)
  const [newIds, setNewIds] = useState<Set<number>>(new Set())
  const [isLive, setIsLive] = useState(true)
  const bottomRef           = useRef<HTMLDivElement>(null)

  const fetchEvents = async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await api.get(`/leads/${leadId}/events`, { params: { since_id: lastIdRef.current } })
      const { events: newEvents, last_id } = res.data
      const added: number[] = []
      newEvents.forEach((e: any) => {
        if (!eventsMapRef.current.has(e.id)) {
          eventsMapRef.current.set(e.id, e)
          added.push(e.id)
        }
      })
      if (added.length > 0) {
        setEvents([...eventsMapRef.current.values()])
        setNewIds(new Set(added))
        lastIdRef.current = last_id
        setLastId(last_id)
        setTimeout(() => setNewIds(new Set()), 2000)
      }
    } catch {
      // silent
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    eventsMapRef.current = new Map()
    lastIdRef.current    = 0
    fetchEvents()
    const id = setInterval(fetchEvents, 2500)
    return () => clearInterval(id)
  }, [leadId])

  useEffect(() => {
    if (isLive) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

  const warnCount  = events.filter(e => e.level === 'warning').length
  const errorCount = events.filter(e => e.level === 'error').length

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 h-screen w-[520px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-black/40 z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{leadName}</h2>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{events.length} events · live</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLive(p => !p)}
              className={cn('text-xs px-2 py-1 rounded-md border transition-colors',
                isLive ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' : 'text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700')}
            >
              {isLive ? 'Auto-scroll on' : 'Auto-scroll off'}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Stream */}
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <p className="text-sm">Waiting for events…</p>
            </div>
          )}
          {events.map(e => <EventRow key={e.id} event={e} isNew={newIds.has(e.id)} />)}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                <AlertCircle size={12} /> {errorCount} error{errorCount > 1 ? 's' : ''}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400">
                <AlertTriangle size={12} /> {warnCount} warning{warnCount > 1 ? 's' : ''}
              </span>
            )}
            {errorCount === 0 && warnCount === 0 && events.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <CheckCircle2 size={12} className="text-emerald-400" /> No issues
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-300 dark:text-slate-600">id: {lastId}</span>
        </div>
      </div>
    </>
  )
}
