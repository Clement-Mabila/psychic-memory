'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { cn, formatRelativeTime } from '@/lib/utils'
import { MoreHorizontal, Star, Search, AudioLines, CirclePlay, Circle, Octagon, Pentagon, Squircle, Aperture, Atom, Plus, CircleArrowOutUpRight } from 'lucide-react'
import api, { securityApi } from '@/lib/api'
import { useAgentFocus } from '@/lib/agent-focus-context'
import { useTicketAccountFocus } from '@/lib/ticket-account-context'
import { AddTicketModal } from '@/components/tickets/AddTicketModal'
import { AgentLogsPanel } from '@/components/agents/AgentLogsPanel'
import { LiveRunPanel } from '@/components/agents/LiveRunPanel'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Avatar } from '@/components/ui/Avatar'
import axios from 'axios'
import Cookies from 'js-cookie'

interface PageHeaderProps {
  className?: string
}

const AGENT_META: Record<string, { icon: React.ElementType; color: string }> = {
  discovery:            { icon: Pentagon,  color: 'text-indigo-500'  },
  research:             { icon: Aperture,  color: 'text-purple-500'  },
  company_intel:        { icon: Octagon,   color: 'text-sky-500'     },
  contact:              { icon: Aperture,  color: 'text-pink-500'    },
  enrichment:           { icon: Circle,    color: 'text-orange-500'  },
  qualification:        { icon: Squircle,  color: 'text-emerald-500' },
  handoff:              { icon: Pentagon,  color: 'text-teal-500'    },
  research_critic:      { icon: Squircle,  color: 'text-violet-500'  },
  contact_critic:       { icon: Atom,      color: 'text-rose-500'    },
  enrichment_critic:    { icon: Squircle,  color: 'text-amber-500'   },
  qualification_critic: { icon: Atom,      color: 'text-cyan-500'    },
  outreach_critic:      { icon: Atom,      color: 'text-lime-500'    },
  supervisor_critic:    { icon: Atom,      color: 'text-fuchsia-500' },
  system_llm:           { icon: Atom,      color: 'text-pink-400'    },
}

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  success: { dot: 'bg-emerald-400',              label: 'Completed'  },
  failed:  { dot: 'bg-red-400',                  label: 'Failed'     },
  running: { dot: 'bg-blue-400 animate-pulse',   label: 'Running'    },
  pending: { dot: 'bg-amber-400',                label: 'Pending'    },
}

// ── Tickets header (inline) ───────────────────────────────────────────────────

function TicketsPageHeader({ className }: { className?: string }) {
  const { ticketFocus } = useTicketAccountFocus()
  const accountName     = ticketFocus?.label ?? 'All Tickets'
  const [addModalOpen, setAddModalOpen] = useState(false)

  // Fetch ticket list for submitter avatars + stats
  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: ['ticket-list'],
    queryFn: async () => {
      const token = Cookies.get('access_token')
      const { data } = await axios.get('/api/tickets/', {
        params: { per_page: 100 },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return data.results ?? []
    },
    staleTime: 10_000,
  })

  const domainTickets = ticketFocus
    ? tickets.filter((t: any) => t.submitter_email?.split('@')[1] === ticketFocus.domain)
    : tickets

  // 3 most recent tickets — mirrors recentLeads in AgentPageHeader (always from live data)
  const recentTickets = [...domainTickets]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  const openCount    = domainTickets.filter((t: any) => t.status === 'open' || t.status === 'auto_responded' || t.status === 'in_review').length
  const slaCount     = domainTickets.filter((t: any) => t.sla_breached).length

  // Unique submitter avatars (top 3)
  const seenEmails = new Set<string>()
  const avatarUsers: { email: string; name: string }[] = []
  for (const t of domainTickets) {
    if (!seenEmails.has(t.submitter_email)) {
      seenEmails.add(t.submitter_email)
      const local = (t.submitter_email ?? '').split('@')[0]
      avatarUsers.push({
        email: t.submitter_email,
        name:  local.split(/[._-]/).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
      })
    }
    if (avatarUsers.length >= 3) break
  }
  const extraCount = Math.max(0, seenEmails.size - 3)

  return (
    <>
    <header className={cn('bg-white border-b border-gray-100 px-8 pt-8 pb-5 flex-shrink-0 dark:bg-neutral-900 dark:border-neutral-900', className)}>

      {/* Title row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <Squircle size={16} className="flex-shrink-0 text-violet-500" strokeWidth={1.75} />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight dark:text-slate-100">{accountName}</h1>
        </div>

        {/* Right: theme + search + star + more */}
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <Search size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-500 transition-colors">
            <Star size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Recent tickets breadcrumb — mirrors recent leads in AgentPageHeader */}
      <div className="pl-6 mb-5 min-h-[18px]">
        {recentTickets.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 text-xs select-none dark:text-slate-600">└</span>
            {recentTickets.map((t: any, i: number) => (
              <span key={t.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300 text-xs dark:text-slate-600">/</span>}
                <span className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 cursor-pointer transition-colors">
                  <span className="w-3 h-3 rounded-sm border border-gray-300 dark:border-slate-600 flex-shrink-0 dark:border-slate-600" />
                  {t.subject.length > 24 ? t.subject.slice(0, 24) + '…' : t.subject}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats row + right: avatar stack + add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 dark:text-slate-500">
            <span className="text-gray-600 font-medium dark:text-slate-300">{domainTickets.length}</span> tickets
          </span>
          {openCount > 0 && (
            <>
              <span className="text-gray-200 text-xs dark:text-slate-700">·</span>
              <span className="text-xs text-gray-400 dark:text-slate-500"><span className="text-gray-600 font-medium dark:text-slate-300">{openCount}</span> open</span>
            </>
          )}
          {slaCount > 0 && (
            <>
              <span className="text-gray-200 text-xs dark:text-slate-700">·</span>
              <span className="text-xs text-red-500 dark:text-red-400 font-medium">{slaCount} SLA breached</span>
            </>
          )}
        </div>

        {/* Avatar stack + add button — replaces AudioLines/CirclePlay */}
        <div className="flex items-center gap-2">
          {avatarUsers.length > 0 && (
            <div className="flex items-center">
              {avatarUsers.map((u, i) => (
                <div key={u.email} className={cn('ring-2 ring-white dark:ring-neutral-900 rounded-full', i > 0 && '-ml-1.5')}>
                  <Avatar email={u.email} name={u.name} size="xs" />
                </div>
              ))}
              {extraCount > 0 && (
                <div className="-ml-1.5 w-7 h-7 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">+{extraCount}</span>
                </div>
              )}
            </div>
          )}
          <div className="w-px h-6 bg-gray-200 dark:bg-neutral-700 mx-1" />
          <button
            title="New Ticket"
            onClick={() => setAddModalOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-2xl font-medium transition-colors bg-cyan-500 text-white hover:bg-cyan-600"
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

    </header>

    {addModalOpen && <AddTicketModal onClose={() => setAddModalOpen(false)} />}
  </>
  )
}

// ── Leads header ─────────────────────────────────────────────────────────────

function LeadsPageHeader({ className }: { className?: string }) {
  const { data: repsData } = useQuery<any[]>({
    queryKey: ['reps'],
    queryFn:  () => api.get('/reps').then(r => r.data.reps ?? []),
    staleTime: 60_000,
  })

  const { data: leadsData } = useQuery<any>({
    queryKey: ['leads-header'],
    queryFn:  () => api.get('/leads', { params: { page_size: 3, page: 1 } }).then(r => r.data),
    staleTime: 30_000,
  })

  const reps: any[]      = repsData ?? []
  const recentLeads: any[] = leadsData?.leads?.slice(0, 3) ?? []
  const total: number    = leadsData?.total ?? 0

  const visibleReps = reps.slice(0, 3)
  const extraCount  = Math.max(0, reps.length - 3)

  return (
    <header className={cn('bg-white border-b border-gray-100 px-8 pt-8 pb-5 flex-shrink-0 dark:bg-neutral-900 dark:border-neutral-900', className)}>

      {/* Title row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <Squircle size={16} className="flex-shrink-0 text-rose-500" strokeWidth={1.75} />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight dark:text-slate-100">Leads</h1>
        </div>

        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <Search size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-500 transition-colors">
            <Star size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Recent leads breadcrumb */}
      <div className="pl-6 mb-5 min-h-[18px]">
        {recentLeads.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 text-xs select-none dark:text-slate-600">└</span>
            {recentLeads.map((lead: any, i: number) => (
              <span key={lead.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300 text-xs dark:text-slate-600">/</span>}
                <span className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 cursor-pointer transition-colors">
                  <span className="w-3 h-3 rounded-sm border border-gray-300 dark:border-slate-600 flex-shrink-0" />
                  {lead.company_name?.length > 24 ? lead.company_name.slice(0, 24) + '…' : lead.company_name}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats + rep avatars */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {total > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              <span className="text-gray-600 font-medium dark:text-slate-300">{total}</span> leads
            </span>
          )}
          {reps.length > 0 && (
            <>
              {total > 0 && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}
              <span className="text-xs text-gray-400 dark:text-slate-500">
                <span className="text-gray-600 font-medium dark:text-slate-300">{reps.length}</span> reps active
              </span>
            </>
          )}
        </div>

        {/* Rep avatar stack */}
        {visibleReps.length > 0 && (
          <div className="flex items-center">
            {visibleReps.map((r, i) => (
              <div key={r.id} className={cn('ring-2 ring-white dark:ring-neutral-900 rounded-full', i > 0 && '-ml-1.5')}>
                <Avatar name={r.full_name} email={r.email} size="xs" />
              </div>
            ))}
            {extraCount > 0 && (
              <div className="-ml-1.5 w-7 h-7 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">+{extraCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

    </header>
  )
}

// ── Contacts header ───────────────────────────────────────────────────────────

function ContactsPageHeader({ className }: { className?: string }) {
  const { data: repsData } = useQuery<any[]>({
    queryKey: ['reps'],
    queryFn:  () => api.get('/reps').then(r => r.data.reps ?? []),
    staleTime: 60_000,
  })

  const { data: contactsData } = useQuery<any>({
    queryKey: ['contacts-header'],
    queryFn:  () => api.get('/contacts', { params: { page_size: 3, page: 1 } }).then(r => r.data),
    staleTime: 30_000,
  })

  const reps: any[]           = repsData ?? []
  const recentContacts: any[] = contactsData?.contacts?.slice(0, 3) ?? []
  const total: number         = contactsData?.total ?? 0
  const visibleReps           = reps.slice(0, 3)
  const extraCount            = Math.max(0, reps.length - 3)

  return (
    <header className={cn('bg-white border-b border-gray-100 px-8 pt-8 pb-5 flex-shrink-0 dark:bg-neutral-900 dark:border-neutral-900', className)}>

      {/* Title row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <Circle size={16} className="flex-shrink-0 text-sky-500" strokeWidth={1.75} />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight dark:text-slate-100">Contacts</h1>
        </div>

        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <Search size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-500 transition-colors">
            <Star size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Recent contacts breadcrumb */}
      <div className="pl-6 mb-5 min-h-[18px]">
        {recentContacts.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 text-xs select-none dark:text-slate-600">└</span>
            {recentContacts.map((c: any, i: number) => (
              <span key={c.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300 text-xs dark:text-slate-600">/</span>}
                <span className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 cursor-pointer transition-colors">
                  <span className="w-3 h-3 rounded-sm border border-gray-300 dark:border-slate-600 flex-shrink-0" />
                  {c.name?.length > 24 ? c.name.slice(0, 24) + '…' : c.name}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats + rep avatars */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {total > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              <span className="text-gray-600 font-medium dark:text-slate-300">{total}</span> contacts
            </span>
          )}
          {reps.length > 0 && (
            <>
              {total > 0 && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}
              <span className="text-xs text-gray-400 dark:text-slate-500">
                <span className="text-gray-600 font-medium dark:text-slate-300">{reps.length}</span> reps active
              </span>
            </>
          )}
        </div>

        {visibleReps.length > 0 && (
          <div className="flex items-center">
            {visibleReps.map((r: any, i: number) => (
              <div key={r.id} className={cn('ring-2 ring-white dark:ring-neutral-900 rounded-full', i > 0 && '-ml-1.5')}>
                <Avatar name={r.full_name} email={r.email} size="xs" />
              </div>
            ))}
            {extraCount > 0 && (
              <div className="-ml-1.5 w-7 h-7 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">+{extraCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

    </header>
  )
}

// ── Agent header ─────────────────────────────────────────────────────────────

function AgentPageHeader({ className }: { className?: string }) {
  const { focusedAgent } = useAgentFocus()
  const router           = useRouter()
  const pathname         = usePathname()
  const [logsOpen, setLogsOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['sidebar-agents'],
    queryFn:  () => api.get('/agents').then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  // Poll for live active executions every 5s
  const { data: activeData } = useQuery({
    queryKey: ['agents-active'],
    queryFn:  () => api.get('/agents/active').then(r => r.data),
    refetchInterval: 5_000,
    staleTime: 4_000,
  })
  const liveExecutions: any[] = activeData?.active ?? []
  const isAnyRunning = liveExecutions.length > 0
  const liveExecution = liveExecutions[0] ?? null

  const agents: any[] = data?.agents ?? []

  const lastRun = agents
    .filter(a => a.last_run_at)
    .sort((a, b) => new Date(b.last_run_at).getTime() - new Date(a.last_run_at).getTime())[0]

  // Priority: live running > sidebar-clicked > last run
  const liveAgentMeta = liveExecution
    ? { agent_type: liveExecution.agent_type, display_name: liveExecution.agent_type.replace(/_/g, ' '), recent_leads: [] }
    : null
  const activeAgent = liveAgentMeta ?? focusedAgent ?? lastRun

  const meta        = AGENT_META[activeAgent?.agent_type] ?? { icon: Circle, color: 'text-gray-400' }
  const AgentIcon   = meta.icon
  const agentName   = liveExecution
    ? (agents.find(a => a.agent_type === liveExecution.agent_type)?.display_name ?? liveExecution.agent_type.replace(/_/g, ' '))
    : (activeAgent?.display_name ?? '—')
  const recentLeads: { company_name: string }[] = liveExecution
    ? [{ company_name: liveExecution.lead_name }]
    : (activeAgent?.recent_leads?.slice(0, 3) ?? [])

  const status      = liveExecution ? 'running' : activeAgent?.last_status
  const statusStyle = STATUS_STYLE[status] ?? null
  const lastRunAt   = activeAgent?.last_run_at
  const runs24h     = activeAgent?.runs_24h ?? 0

  const runMutation = useMutation({
    mutationFn: () => api.post(`/leads/bulk/`, {
      lead_ids: activeAgent?.recent_leads?.map((l: any) => l.lead_id).filter(Boolean) ?? [],
      action: 'run',
    }),
  })

  // Role — default to super_admin view while loading so agent UI doesn't flash away
  const { data: me } = useQuery({
    queryKey: ['security-me'],
    queryFn:  securityApi.getMe,
    staleTime: 300_000,
  })
  const isSuperAdmin = me === undefined || me.role === 'super_admin'

  // Rep / leads data for non-super_admin view
  const { data: repsData } = useQuery<any[]>({
    queryKey: ['reps'],
    queryFn:  () => api.get('/reps').then(r => r.data.reps ?? []),
    staleTime: 60_000,
    enabled:  !isSuperAdmin,
  })
  const { data: leadsHeaderData } = useQuery<any>({
    queryKey: ['leads-header'],
    queryFn:  () => api.get('/leads', { params: { page_size: 3, page: 1 } }).then(r => r.data),
    staleTime: 30_000,
    enabled:  !isSuperAdmin,
  })

  // Spotlight leads — recent 3 from active pipeline stages (for non-super_admin header)
  const { data: spotlightData } = useQuery<any>({
    queryKey: ['leads-spotlight-header'],
    queryFn:  () => api.get('/leads', {
      params: { page_size: 3, page: 1, stage: 'mql,sql,qualification,needs_review' },
    }).then(r => r.data),
    staleTime: 30_000,
    enabled:  !isSuperAdmin,
  })

  const reps           = repsData ?? []
  const leadsTotal     = leadsHeaderData?.total ?? 0
  const spotlightLeads: any[] = spotlightData?.leads?.slice(0, 3) ?? []
  const displayLeads   = isSuperAdmin ? recentLeads : spotlightLeads
  const visibleReps    = reps.slice(0, 3)
  const extraRepCount  = Math.max(0, reps.length - 3)

  return (
    <>
    <header className={cn('bg-white border-b border-gray-100 px-8 pt-8 pb-5 flex-shrink-0 dark:bg-neutral-900 dark:border-neutral-900', className)}>

      {/* ── Title row ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          {isSuperAdmin ? (
            <>
              <AgentIcon
                size={16}
                className={cn('flex-shrink-0', meta.color, isAnyRunning && 'animate-pulse')}
                strokeWidth={1.75}
              />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight dark:text-slate-100">{agentName}</h1>
              {isAnyRunning && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Live
                </span>
              )}
            </>
          ) : (
            <>
              <CircleArrowOutUpRight size={16} className="flex-shrink-0 text-violet-500" strokeWidth={1.75} />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight dark:text-slate-100">Pipeline Spotlight</h1>
            </>
          )}
        </div>

        {/* Search · Star · More */}
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <Search size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-500 transition-colors">
            <Star size={16} strokeWidth={1.75} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* ── Breadcrumb — agent recent leads (admin) or spotlight companies (others) ── */}
      <div className="pl-6 mb-5 min-h-[18px]">
        {displayLeads.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 text-xs select-none dark:text-slate-600">└</span>
            {displayLeads.map((lead: any, i: number) => (
              <span key={lead.id ?? i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300 text-xs dark:text-slate-600">/</span>}
                <span className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 cursor-pointer transition-colors">
                  <span className="w-3 h-3 rounded-sm border border-gray-300 dark:border-slate-600 flex-shrink-0" />
                  {lead.company_name?.length > 24 ? lead.company_name.slice(0, 24) + '…' : lead.company_name}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats row — agent view for super_admin, rep view for everyone else ── */}
      <div className="flex items-center justify-between">
        {isSuperAdmin ? (
          <>
            <div className="flex items-center gap-4">
              {statusStyle && (
                <div className="flex items-center gap-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusStyle.dot)} />
                  <span className="text-xs text-gray-500 dark:text-slate-400">{statusStyle.label}</span>
                </div>
              )}
              {statusStyle && lastRunAt && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}
              {lastRunAt && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  Last run <span className="text-gray-600 font-medium dark:text-slate-300">{formatRelativeTime(lastRunAt)}</span>
                </span>
              )}
              {lastRunAt && runs24h > 0 && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}
              {runs24h > 0 && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  <span className="text-gray-600 font-medium dark:text-slate-300">{runs24h}</span> runs today
                </span>
              )}
              {runs24h > 0 && recentLeads.length > 0 && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}
              {recentLeads.length > 0 && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  <span className="text-gray-600 font-medium dark:text-slate-300">{recentLeads.length}</span> recent leads
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogsOpen(true)}
                className="h-9 w-9 flex items-center justify-center rounded-2xl text-gray-600 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-700 transition-colors"
              >
                <AudioLines size={16} strokeWidth={2} />
              </button>
              <button
                onClick={() => !isAnyRunning && runMutation.mutate()}
                disabled={runMutation.isPending || !activeAgent || isAnyRunning}
                title={isAnyRunning ? `${agentName} is running…` : 'Run agent'}
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-2xl font-medium transition-colors',
                  isAnyRunning
                    ? 'bg-stone-400 text-white cursor-not-allowed'
                    : 'bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500'
                )}
              >
                <CirclePlay size={16} strokeWidth={2} className={isAnyRunning ? 'animate-pulse' : ''} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Sales rep stats — mirrors LeadsPageHeader */}
            <div className="flex items-center gap-4">
              {leadsTotal > 0 && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  <span className="text-gray-600 font-medium dark:text-slate-300">{leadsTotal}</span> leads
                </span>
              )}
              {reps.length > 0 && (
                <>
                  {leadsTotal > 0 && <span className="text-gray-200 text-xs dark:text-slate-700">·</span>}
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    <span className="text-gray-600 font-medium dark:text-slate-300">{reps.length}</span> reps active
                  </span>
                </>
              )}
            </div>

            {/* Rep avatar stack */}
            {visibleReps.length > 0 && (
              <div className="flex items-center">
                {visibleReps.map((r: any, i: number) => (
                  <div key={r.id} className={cn('ring-2 ring-white dark:ring-neutral-900 rounded-full', i > 0 && '-ml-1.5')}>
                    <Avatar name={r.full_name} email={r.email} size="xs" />
                  </div>
                ))}
                {extraRepCount > 0 && (
                  <div className="-ml-1.5 w-7 h-7 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">+{extraRepCount}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </header>

    {logsOpen && isAnyRunning && liveExecution && (
      <LiveRunPanel
        leadId={liveExecution.lead_id}
        leadName={liveExecution.lead_name}
        onClose={() => setLogsOpen(false)}
      />
    )}
    {logsOpen && !isAnyRunning && (
      <AgentLogsPanel
        agentType={activeAgent?.agent_type ?? null}
        agentName={agentName}
        onClose={() => setLogsOpen(false)}
      />
    )}
  </>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────

export function PageHeader({ className }: PageHeaderProps) {
  const pathname = usePathname()
  if (pathname.startsWith('/tickets'))  return <TicketsPageHeader  className={className} />
  if (pathname.startsWith('/leads'))    return <LeadsPageHeader    className={className} />
  if (pathname.startsWith('/contacts')) return <ContactsPageHeader className={className} />
  return <AgentPageHeader className={className} />
}
