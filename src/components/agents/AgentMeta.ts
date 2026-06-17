import {
  Circle, Octagon, Pentagon, Squircle, Aperture, Atom,
} from 'lucide-react'

export interface AgentMeta {
  label: string
  icon: React.ElementType
  color: string
  cardColor: string   // solid bg class used as fallback when no vertical
  iconBg: string
  accentBorder: string
}

export const AGENT_META: Record<string, AgentMeta> = {
  discovery:            { label: 'Discovery',            icon: Pentagon,  color: 'text-indigo-600 dark:text-indigo-400',   cardColor: 'bg-zinc-300', iconBg: 'bg-indigo-100 dark:bg-indigo-950/40',   accentBorder: 'border-zinc-300' },
  research:             { label: 'Research',             icon: Aperture,  color: 'text-purple-600 dark:text-purple-400',   cardColor: 'bg-zinc-300', iconBg: 'bg-purple-100 dark:bg-purple-950/40',   accentBorder: 'border-zinc-300' },
  company_intel:        { label: 'Company Intel',        icon: Octagon,   color: 'text-sky-600 dark:text-sky-400',         cardColor: 'bg-zinc-300', iconBg: 'bg-sky-100 dark:bg-sky-950/40',         accentBorder: 'border-zinc-300' },
  contact:              { label: 'Contact',              icon: Aperture,  color: 'text-pink-600 dark:text-pink-400',       cardColor: 'bg-zinc-300', iconBg: 'bg-pink-100 dark:bg-pink-950/40',       accentBorder: 'border-zinc-300' },
  enrichment:           { label: 'Enrichment',           icon: Circle,    color: 'text-orange-600 dark:text-orange-400',   cardColor: 'bg-zinc-300', iconBg: 'bg-orange-100 dark:bg-orange-950/40',   accentBorder: 'border-zinc-300' },
  qualification:        { label: 'Qualification',        icon: Squircle,  color: 'text-emerald-600 dark:text-emerald-400', cardColor: 'bg-zinc-300', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', accentBorder: 'border-zinc-300' },
  handoff:              { label: 'Handoff',              icon: Pentagon,  color: 'text-teal-600 dark:text-teal-400',       cardColor: 'bg-zinc-300', iconBg: 'bg-teal-100 dark:bg-teal-950/40',       accentBorder: 'border-zinc-300' },
  research_critic:      { label: 'Research Critic',      icon: Squircle,  color: 'text-violet-600 dark:text-violet-400',   cardColor: 'bg-zinc-300', iconBg: 'bg-violet-100 dark:bg-violet-950/40',   accentBorder: 'border-zinc-300' },
  contact_critic:       { label: 'Contact Critic',       icon: Atom,      color: 'text-rose-600 dark:text-rose-400',       cardColor: 'bg-zinc-300', iconBg: 'bg-rose-100 dark:bg-rose-950/40',       accentBorder: 'border-zinc-300' },
  enrichment_critic:    { label: 'Enrichment Critic',    icon: Squircle,  color: 'text-amber-600 dark:text-amber-400',     cardColor: 'bg-zinc-300', iconBg: 'bg-amber-100 dark:bg-amber-950/40',     accentBorder: 'border-zinc-300' },
  qualification_critic: { label: 'Qualification Critic', icon: Atom,      color: 'text-cyan-600 dark:text-cyan-400',       cardColor: 'bg-zinc-300', iconBg: 'bg-cyan-100 dark:bg-cyan-950/40',       accentBorder: 'border-zinc-300' },
  outreach_critic:      { label: 'Outreach Critic',      icon: Atom,      color: 'text-lime-600 dark:text-lime-400',       cardColor: 'bg-zinc-300', iconBg: 'bg-lime-100 dark:bg-lime-950/40',       accentBorder: 'border-zinc-300' },
  supervisor_critic:    { label: 'Supervisor Critic',    icon: Atom,      color: 'text-fuchsia-600 dark:text-fuchsia-400', cardColor: 'bg-zinc-300', iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-950/40', accentBorder: 'border-zinc-300' },
  system_llm:           { label: 'System LLM',           icon: Atom,      color: 'text-pink-600 dark:text-pink-400',       cardColor: 'bg-zinc-300', iconBg: 'bg-pink-100 dark:bg-pink-950/40',       accentBorder: 'border-zinc-300' },
}

// Vertical → solid card colour
export const VERTICAL_COLOR: Record<string, string> = {
  casino:   'bg-pink-300',
  airport:  'bg-zinc-300',
  hospital: 'bg-zinc-300',
  transit:  'bg-zinc-300',
  mall:     'bg-zinc-300',
}

export const PIPELINE_AGENTS  = ['discovery', 'research', 'company_intel', 'contact', 'enrichment', 'qualification', 'handoff']
export const CRITIC_AGENTS    = ['research_critic', 'contact_critic', 'enrichment_critic', 'qualification_critic', 'outreach_critic', 'supervisor_critic']
export const LLM_AGENTS       = ['system_llm']

export const NAV_GROUPS = [
  { title: 'Pipeline', types: PIPELINE_AGENTS },
  { title: 'Critics',  types: CRITIC_AGENTS   },
  { title: 'Models',   types: LLM_AGENTS      },
]
