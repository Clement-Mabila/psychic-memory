import type { Draft } from './types'

export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function scoreBarColour(v: number | null): string {
  if (v == null) return 'bg-gray-200 dark:bg-neutral-700'
  if (v >= 55) return 'bg-emerald-400'
  if (v >= 30) return 'bg-amber-400'
  return 'bg-red-400'
}

export function scoreTextColour(v: number | null): string {
  if (v == null) return 'text-gray-300 dark:text-slate-600'
  if (v >= 55) return 'text-emerald-600 dark:text-emerald-400'
  if (v >= 30) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

export function buildDraft(lead: any): Draft {
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
