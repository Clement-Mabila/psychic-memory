'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  LayoutGrid, Users, Clock, ShieldCheck, Cog, LogOut, Atom,
  Contact, WalletCards, Layers2, Waypoints, PanelRight, Search,
  ChevronDown, ChevronRight, Squircle, Circle, SwatchBook,
} from 'lucide-react'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { logout } from '@/lib/api'
import api from '@/lib/api'
import { useAgentFocus } from '@/lib/agent-focus-context'
import { useAgentSelection } from '@/lib/agent-selection-context'
import { AGENT_META } from '@/components/agents/AgentMeta'

// ── AiSoundIcon ───────────────────────────────────────────────────────────────
function AiSoundIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="1"  y="8"  width="2.5" height="8"  rx="1.25" />
      <rect x="5"  y="5"  width="2.5" height="14" rx="1.25" />
      <rect x="9"  y="2"  width="2.5" height="20" rx="1.25" />
      <rect x="13" y="5"  width="2.5" height="14" rx="1.25" />
      <rect x="17" y="8"  width="2.5" height="8"  rx="1.25" />
      <path d="M21 0.5l.55 1.7 1.7.55-1.7.55-.55 1.7-.55-1.7-1.7-.55 1.7-.55z" />
    </svg>
  )
}

// ── OllamaIcon ────────────────────────────────────────────────────────────────
function OllamaIcon({ size = 19 }: { size?: number }) {
  return (
    <svg height={size} width={size} viewBox="0 0 75 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M24.7031 3.36019C25.3781 3.62227 25.9875 4.05394 26.5406 4.62436C27.4625 5.56786 28.2406 6.91836 28.8344 8.51861C29.4313 10.1281 29.8188 11.9103 29.9656 13.6986C31.9332 12.6003 34.1167 11.9316 36.3688 11.7376L36.5281 11.7253C39.2469 11.5094 41.9344 11.9935 44.2781 13.1868C44.5938 13.3502 44.9031 13.5259 45.2063 13.7109C45.3625 11.9565 45.7438 10.2144 46.3313 8.64194C46.925 7.03861 47.7031 5.69119 48.6219 4.74461C49.1353 4.19659 49.7634 3.76524 50.4625 3.48044C51.2656 3.17211 52.1188 3.11661 52.95 3.35094C54.2031 3.70244 55.2781 4.48561 56.125 5.62336C56.9 6.66244 57.4813 7.99444 57.8781 9.59161C58.5969 12.4714 58.7219 16.2609 58.2375 20.8304L58.4031 20.9537L58.4844 21.0123C60.85 22.7883 62.4969 25.3197 63.3688 28.2581C64.7281 32.843 64.0438 37.986 61.7 40.8628L61.6438 40.9275L61.65 40.9368C62.9531 43.2863 63.7438 45.7684 63.9125 48.3368L63.9188 48.4293C64.1188 51.713 63.2938 55.0184 61.375 58.2651L61.3531 58.2959L61.3844 58.3699C62.8594 61.9374 63.3219 65.5294 62.7531 69.1184L62.7344 69.2387C62.6463 69.7629 62.351 70.2313 61.9134 70.5411C61.4758 70.8509 60.9316 70.9769 60.4 70.8914C60.1368 70.8508 59.8843 70.7594 59.6569 70.6224C59.4296 70.4854 59.2318 70.3055 59.0751 70.093C58.9183 69.8804 58.8056 69.6395 58.7434 69.3839C58.6812 69.1283 58.6707 68.8631 58.7125 68.6035C59.2344 65.4184 58.7438 62.2241 57.2125 58.9743C57.0696 58.6724 57.0062 58.3398 57.028 58.0073C57.0499 57.6748 57.1563 57.353 57.3375 57.0719L57.35 57.0534C59.2375 54.2044 60.0188 51.4109 59.85 48.6667C59.7063 46.2648 58.8344 43.906 57.35 41.6583C57.0613 41.2213 56.9585 40.6898 57.0637 40.1786C57.169 39.6674 57.4739 39.2176 57.9125 38.9264L57.9406 38.9079C58.7 38.4177 59.4 37.1659 59.7531 35.4546C60.1428 33.4311 60.041 31.3453 59.4563 29.3681C58.8156 27.2098 57.6438 25.4091 56.0031 24.1789C54.1438 22.779 51.6813 22.1038 48.5656 22.298C48.1582 22.3242 47.7522 22.2291 47.4002 22.0252C47.0481 21.8213 46.7661 21.5178 46.5906 21.1541C45.6094 19.1037 44.1781 17.636 42.3938 16.7264C40.6806 15.8828 38.7627 15.5283 36.8563 15.7028C32.9656 16.008 29.5344 18.1725 28.5125 20.9013C28.3679 21.2853 28.1079 21.6166 27.7672 21.8508C27.4265 22.085 27.0215 22.2109 26.6063 22.2117C23.2719 22.2179 20.6906 22.9887 18.8031 24.3793C17.1719 25.5818 16.0594 27.2622 15.4719 29.2756C14.9402 31.1708 14.8675 33.1627 15.2594 35.0908C15.6094 36.8113 16.2938 38.2358 17.0781 39.0035L17.1031 39.0251C17.7656 39.6634 17.9063 40.6593 17.4438 41.4455C16.3188 43.3634 15.4781 46.2216 15.3406 48.9689C15.1844 52.1077 15.9219 54.8334 17.5875 56.7882L17.6375 56.8468C17.8889 57.1358 18.0505 57.4901 18.1032 57.8674C18.1558 58.2447 18.0972 58.629 17.9344 58.9743C16.1344 62.7853 15.5813 65.9179 16.1781 68.3846C16.2854 68.8975 16.1856 69.4315 15.8999 69.8729C15.6142 70.3143 15.1652 70.6283 14.6485 70.748C14.1317 70.8678 13.588 70.7838 13.1331 70.514C12.6781 70.2442 12.3478 69.8099 12.2125 69.3034C11.4531 66.1646 11.9688 62.5694 13.6906 58.5179L13.7344 58.41L13.7094 58.373C12.8631 57.1397 12.2315 55.7756 11.8406 54.3369L11.825 54.2784C11.3507 52.4835 11.164 50.6264 11.2719 48.7746C11.4094 45.9688 12.1406 43.0951 13.2156 40.7888L13.2531 40.7086L13.2469 40.7024C12.3312 39.4136 11.6531 37.764 11.2781 35.9387L11.2625 35.8647C10.7458 33.3186 10.8454 30.6882 11.5531 28.1872C12.3719 25.3659 13.9812 22.9424 16.3531 21.1911C16.5406 21.0524 16.7375 20.9136 16.9344 20.7841C16.4375 16.1807 16.5625 12.3666 17.2844 9.46827C17.6813 7.87111 18.2656 6.53911 19.0406 5.50002C19.8844 4.36536 20.9594 3.58219 22.2125 3.22761C23.0438 2.99327 23.9 3.04569 24.7031 3.35711V3.36019ZM37.5656 31.3877C40.4906 31.3877 43.1906 32.3528 45.2094 34.0239C47.1781 35.6489 48.35 37.8319 48.35 40.0056C48.35 42.7436 47.0813 44.8773 44.8094 46.2401C42.8719 47.3964 40.275 47.9575 37.3 47.9575C34.1469 47.9575 31.4531 47.1589 29.5094 45.6944C27.5813 44.2452 26.5 42.2102 26.5 40.0056C26.5 37.8257 27.7438 35.6365 29.8 34.0054C31.8875 32.3497 34.6438 31.3877 37.5656 31.3877ZM37.5656 34.1504C35.3976 34.1317 33.2871 34.8381 31.5781 36.1545C30.1375 37.2954 29.3219 38.7291 29.3219 40.0087C29.3219 41.3284 29.9781 42.5648 31.2281 43.5052C32.65 44.5751 34.7406 45.1949 37.3 45.1949C39.7969 45.1949 41.9031 44.7416 43.3375 43.8814C44.7844 43.018 45.525 41.7662 45.525 40.0056C45.525 38.7014 44.7563 37.2614 43.3906 36.1329C41.8781 34.8842 39.8281 34.1504 37.5656 34.1504Z" />
    </svg>
  )
}

// ── Nav sections ──────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  [
    { label: 'Overview',    href: '/dashboard',   icon: LayoutGrid  },
    { label: 'Leads',        href: '/leads',        icon: Users       },
    { label: 'Contacts',     href: '/contacts',     icon: Contact     },
    { label: 'AI',  href: '/ai',           icon: AiSoundIcon },
  ],
  [
    { label: 'Agents',       href: '/agents/logs',  icon: Atom        },
    { label: 'Logs Trail',   href: '/agents/run',   icon: SwatchBook  },
    { label: 'Scheduler',    href: '/scheduler',    icon: Clock       },
    { label: 'Critics',      href: '/critics',      icon: ShieldCheck },
    { label: 'Intelligence', href: '/training',     icon: OllamaIcon  },
  ],
  [
    { label: 'Datasets',     href: '/vault',     icon: Layers2     },
    { label: 'Security',     href: '/security',     icon: Waypoints        },
    { label: 'Costs',        href: '/costs',        icon: WalletCards  },
    { label: 'Config',       href: '/settings',     icon: Cog         },
  ],
]

// ── Tooltip ───────────────────────────────────────────────────────────────────
const TOOLTIP = [
  'pointer-events-none absolute left-full ml-3 z-50',
  'rounded-full bg-white dark:bg-neutral-800 shadow-md',
  'px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap',
  'opacity-0 translate-x-1 transition-all duration-150',
  'group-hover:opacity-100 group-hover:translate-x-0',
].join(' ')

// ── Fading divider ────────────────────────────────────────────────────────────
function FadingDivider() {
  return (
    <div className="mx-3 my-1.5 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-neutral-700 to-transparent" />
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({
  icon: Icon,
  label,
  href,
  iconOnly,
}: {
  icon: React.ElementType
  label: string
  href: string
  iconOnly: boolean
}) {
  const pathname = usePathname()
  const active   = pathname.startsWith(href)

  if (iconOnly) {
    return (
      <Link href={href} title={label}
        className="group relative flex flex-col items-center justify-center w-10 mx-auto mb-0.5"
      >
        <span className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200',
          active
            ? 'bg-cyan-600 text-white'
            : 'text-slate-500 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-slate-700 dark:hover:text-slate-300',
        )}>
          <Icon size={17} strokeWidth={1.5} />
        </span>
        {active && <span className="mt-0.5 w-1 h-1 rounded-full bg-cyan-600" />}
        <span className={TOOLTIP}>{label}</span>
      </Link>
    )
  }

  return (
    <Link href={href}
      className="group flex items-center gap-3 w-full rounded-3xl px-1 py-1 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
    >
      <span className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all duration-200',
        active ? 'bg-cyan-600 text-white' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300',
      )}>
        <Icon size={17} strokeWidth={1.5} />
      </span>
      <span className={cn(
        'text-sm whitespace-nowrap flex-1',
        active
          ? 'text-slate-900 dark:text-white font-medium'
          : 'text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200',
      )}>
        {label}
      </span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 mr-1 shrink-0" />}
    </Link>
  )
}

// ── Agent panel helpers ────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  success: 'bg-green-400',
  failed:  'bg-red-400',
  running: 'bg-blue-400 animate-pulse',
  pending: 'bg-amber-400',
}

function AgentItem({
  agent,
  isActive,
  onSelect,
}: {
  agent: any
  isActive: boolean
  onSelect: () => void
}) {
  const [open, setOpen]     = useState(false)
  const router              = useRouter()
  const { setFocusedAgent } = useAgentFocus()
  const m                   = AGENT_META[agent.agent_type] ?? { icon: Circle, color: 'text-gray-400', iconBg: 'bg-gray-100 dark:bg-neutral-800' }
  const Icon                = m.icon
  const dotClass            = STATUS_DOT[agent.last_status] ?? null
  const hasLeads            = (agent.recent_leads?.length ?? 0) > 0

  return (
    <div>
      <div
        onClick={() => {
          setOpen(o => !o)
          onSelect()
          setFocusedAgent({
            agent_type:   agent.agent_type,
            display_name: agent.display_name,
            recent_leads: agent.recent_leads ?? [],
          })
        }}
        className={cn(
          'group flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all',
          isActive
            ? 'bg-white dark:bg-neutral-900 shadow-sm'
            : 'hover:bg-white/70 dark:hover:bg-neutral-800',
        )}
      >
        {/* Always-colored icon pill */}
        <span className={cn('flex items-center justify-center w-6 h-6 rounded-lg shrink-0', m.iconBg)}>
          <Icon size={13} className={m.color} strokeWidth={1.75} />
        </span>

        {/* Label */}
        <span className="flex-1 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 truncate leading-none">
          {agent.display_name}
        </span>

        {/* Status dot */}
        {dotClass && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />}

        {/* 24h run badge */}
        {agent.runs_24h > 0 && (
          <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {agent.runs_24h > 99 ? '99+' : agent.runs_24h}
          </span>
        )}

        {/* Active dot */}
        {isActive && !dotClass && !agent.runs_24h && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
        )}

        {/* Expand chevron */}
        {hasLeads && (
          open
            ? <ChevronDown  size={11} className="text-gray-400 dark:text-slate-500 shrink-0" />
            : <ChevronRight size={11} className="text-gray-400 dark:text-slate-500 shrink-0" />
        )}
      </div>

      {/* Recent leads */}
      {open && hasLeads && (
        <div className="ml-5 mt-0.5 mb-1 space-y-px border-l border-gray-100 dark:border-neutral-800 pl-3">
          {agent.recent_leads.map((lead: any, i: number) => (
            <button key={i}
              onClick={e => {
                e.stopPropagation()
                if (lead.lead_id) router.push(`/leads?highlight=${lead.lead_id}`)
              }}
              className="flex items-center gap-2 w-full px-2 py-1 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group/lead"
            >
              <Squircle size={13} className="shrink-0 text-stone-500 dark:text-slate-400" strokeWidth={1.5} />
              <span className="text-xs text-gray-500 dark:text-slate-400 group-hover/lead:text-gray-700 dark:group-hover/lead:text-slate-200 truncate">
                {lead.company_name}
              </span>
              {lead.created && (
                <span className="ml-auto text-[10px] text-gray-300 dark:text-slate-600 group-hover/lead:text-gray-400 shrink-0">
                  {formatRelativeTime(lead.created)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Agent panel ───────────────────────────────────────────────────────────────
function AgentPanel() {
  const { activeAgent, setActiveAgent } = useAgentSelection()
  const [searchQ, setSearchQ]           = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Pipeline: true, Critics: true, LLM: false,
  })

  const { data } = useQuery({
    queryKey: ['sidebar-agents'],
    queryFn:  () => api.get('/agents').then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const allAgents: any[] = data?.agents ?? []
  const pipeline = allAgents.filter(a => a.category === 'pipeline')
  const critics  = allAgents.filter(a => a.category === 'critic')
  const llm      = allAgents.filter(a => a.category === 'llm')

  const toggle = (s: string) => setOpenSections(p => ({ ...p, [s]: !p[s] }))
  const filter = (list: any[]) =>
    searchQ ? list.filter(a => a.display_name.toLowerCase().includes(searchQ.toLowerCase())) : list

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 overflow-hidden">

      {/* Search — old plain style */}
      <div className="px-1.5 pt-3 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg">
          <Search size={14} className="text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-500 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto pb-4 px-2 space-y-1">

        <div>
          <button onClick={() => toggle('Pipeline')}
            className="flex items-center gap-1.5 w-full px-2 py-2.5 text-left">
            {openSections.Pipeline
              ? <ChevronDown  size={13} className="text-slate-500 dark:text-slate-400" />
              : <ChevronRight size={13} className="text-slate-500 dark:text-slate-400" />}
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Pipeline Agents</span>
          </button>
          {openSections.Pipeline && filter(pipeline).map(a => (
            <AgentItem key={a.agent_type} agent={a}
              isActive={activeAgent === a.agent_type}
              onSelect={() => setActiveAgent(a.agent_type)}
            />
          ))}
        </div>

        <div>
          <button onClick={() => toggle('Critics')}
            className="flex items-center gap-1.5 w-full px-2 py-2.5 mt-4 text-left">
            {openSections.Critics
              ? <ChevronDown  size={13} className="text-slate-500 dark:text-slate-400" />
              : <ChevronRight size={13} className="text-slate-500 dark:text-slate-400" />}
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Critics</span>
          </button>
          {openSections.Critics && filter(critics).map(a => (
            <AgentItem key={a.agent_type} agent={a}
              isActive={activeAgent === a.agent_type}
              onSelect={() => setActiveAgent(a.agent_type)}
            />
          ))}
        </div>

        <div>
          <button onClick={() => toggle('LLM')}
            className="flex items-center gap-1.5 w-full px-2 py-2 text-left">
            {openSections.LLM
              ? <ChevronDown  size={13} className="text-slate-500 dark:text-slate-400" />
              : <ChevronRight size={13} className="text-slate-500 dark:text-slate-400" />}
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">MBody Models</span>
          </button>
          {openSections.LLM && filter(llm).map(a => (
            <AgentItem key={a.agent_type} agent={a}
              isActive={activeAgent === a.agent_type}
              onSelect={() => setActiveAgent(a.agent_type)}
            />
          ))}
        </div>

      </nav>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname     = usePathname()
  const isAgentsPage = pathname.startsWith('/agents') || pathname.startsWith('/logs')

  // expanded: true = 224px, false = 72px (icon rail)
  const [expanded, setExpanded]     = useState(true)
  const [chatOpen, setChatOpen]     = useState(false)
  const mounted = useRef(false)

  // ⌘K / Ctrl+K toggles chat panel
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setChatOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      const saved = localStorage.getItem('sidebar-expanded')
      if (saved !== null) setExpanded(saved === 'true')
    }
  }, [])

  // Auto-collapse nav to icon-only when arriving on agents page
  useEffect(() => {
    if (isAgentsPage) setExpanded(false)
  }, [isAgentsPage])

  // Sync --sidebar-w CSS variable and persist preference
  useEffect(() => {
    const navW = expanded ? 224 : 72
    const agentW = isAgentsPage ? 220 : 0
    document.documentElement.style.setProperty('--sidebar-w', `${navW + agentW}px`)
    localStorage.setItem('sidebar-expanded', String(expanded))
  }, [expanded, isAgentsPage])

  const iconOnly = !expanded

  return (
    <>
    <aside
      className="fixed top-0 left-0 h-screen z-50 flex flex-row overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: expanded ? (isAgentsPage ? 444 : 224) : (isAgentsPage ? 292 : 72) }}
    >
      {/* ── Main nav rail (always visible) ── */}
      <div className={cn(
        'flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out',
        'bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800',
        expanded ? 'w-56' : 'w-[72px]',
      )}>

        {/* Header */}
        <div className={cn('flex items-center px-3 py-5', expanded ? 'justify-between' : 'justify-center')}>
          {expanded && (
            <div className="flex items-center gap-1">
              <img src="/Logo.svg" alt="MBody" className="w-10 h-10" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Construct Lyra</span>
            </div>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all"
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <PanelRight size={16} strokeWidth={1.5} className={cn('transition-transform duration-300', expanded && 'rotate-180')} />
          </button>
        </div>

        <FadingDivider />

        {/* Nav */}
        <nav className="flex flex-col flex-1 px-3 mt-1 overflow-y-auto">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              <div className="flex flex-col gap-0.5">
                {section.map(item => (
                  <NavItem key={item.href} {...item} iconOnly={iconOnly} />
                ))}
              </div>
              {si < NAV_SECTIONS.length - 1 && <FadingDivider />}
            </div>
          ))}
        </nav>

        <FadingDivider />

        {/* Logout */}
        <div className="px-3 pb-3">
          {expanded ? (
            <button onClick={() => logout()}
              className="group flex items-center gap-3 w-full rounded-full px-3 py-2.5 transition-all text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <span className="flex items-center justify-center w-5 h-5 shrink-0">
                <LogOut size={17} strokeWidth={1.5} />
              </span>
              <span className="text-sm whitespace-nowrap">Sign out</span>
            </button>
          ) : (
            <button onClick={() => logout()}
              className="group relative flex items-center justify-center w-10 h-10 rounded-full mx-auto text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              title="Sign out"
            >
              <LogOut size={17} strokeWidth={1.5} />
              <span className={TOOLTIP}>Sign out</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Agent panel (agents pages only) ── */}
      {isAgentsPage && <AgentPanel />}
    </aside>

    {/* ── MBody Brain chat panel (⌘K) ── */}
    <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}
