import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Phone formatter ───────────────────────────────────────────────────────────

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '—'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  // International or non-standard — return as-is, trimmed
  return raw.trim()
}

// ── Date formatters ───────────────────────────────────────────────────────────

export function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  })
}

export function fmtDatetime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en', {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ── Status badge ──────────────────────────────────────────────────────────────

export function statusBadge(status: string) {
  const map: Record<string, 'neutral' | 'warning' | 'success' | 'danger' | 'info'> = {
    pending:    'warning',
    approved:   'info',
    processing: 'info',
    completed:  'success',
    rejected:   'danger',
  }
  return <Badge variant={map[status] ?? 'neutral'}>{status}</Badge>
}

// ── Record-type badge ─────────────────────────────────────────────────────────

export function recordTypeBadge(rt: string) {
  const map: Record<string, string> = {
    Lead:        'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
    Contact:     'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',
    LeadContact: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  }
  return (
    <span
      className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-full',
        map[rt] ?? 'bg-gray-100 text-gray-600',
      )}
    >
      {rt}
    </span>
  )
}

// ── Table cell value extractor ────────────────────────────────────────────────

export function cellValue(p: any, col: string): string | null {
  switch (col) {
    case 'name':
      return p.canonical_name || null
    case 'email':
      return p.canonical_email || null
    case 'phone':
      return p.canonical_phone ? formatPhone(p.canonical_phone) : null
    case 'linkedin_url': {
      const url = p.canonical_linkedin_url || ''
      const m   = url.match(/linkedin\.com\/in\/([^/?#\s]+)/)
      return m ? `/in/${m[1]}` : (url || null)
    }
    case 'company':
      return p.latest_company || null
    case 'appearances':
      return String(p.total_appearances)
    case 'last_seen':
      return p.last_updated_at
        ? new Date(p.last_updated_at).toLocaleDateString('en', {
            month: 'short',
            day:   'numeric',
            year:  'numeric',
          })
        : null
    default:
      return null
  }
}
