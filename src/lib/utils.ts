import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0)  return 'now'
  if (seconds < 60)  return `${seconds}s`
  if (seconds < 3600) { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}m ${s}s` }
  if (seconds < 86400) { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); return `${h}h ${m}m` }
  const d = Math.floor(seconds / 86400); const h = Math.floor((seconds % 86400) / 3600)
  return `${d}d ${h}h`
}

export const STAGE_COLOURS: Record<string, string> = {
  raw_signal:    'bg-gray-600 text-white',
  discovery:     'bg-purple-600 text-white',
  research:      'bg-blue-600 text-white',
  contact:       'bg-amber-600 text-white',
  enrichment:    'bg-orange-600 text-white',
  qualification: 'bg-indigo-600 text-white',
  sql:           'bg-green-600 text-white',
  mql:           'bg-emerald-600 text-white',
  needs_review:  'bg-red-600 text-white',
  disqualified:  'bg-red-600 text-white',
}

export const VERTICAL_COLOURS: Record<string, string> = {
  casino:   'bg-purple-600 text-white',
  airport:  'bg-blue-600 text-white',
  hospital: 'bg-pink-600 text-white',
  transit:  'bg-amber-600 text-white',
  mall:     'bg-green-600 text-white',
}
