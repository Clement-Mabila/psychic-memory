// ── Quality tier metadata ─────────────────────────────────────────────────────

export type QualityTier = 'actionable' | 'enrichable' | 'discoverable'

export const TIER_META: Record<
  string,
  { label: string; dot: string; activeBg: string; activeText: string }
> = {
  actionable: {
    label:      'Actionable',
    dot:        'bg-emerald-400',
    activeBg:   'bg-emerald-50 dark:bg-emerald-950/40',
    activeText: 'text-emerald-700 dark:text-emerald-300',
  },
  enrichable: {
    label:      'Enrichable',
    dot:        'bg-amber-400',
    activeBg:   'bg-amber-50 dark:bg-amber-950/40',
    activeText: 'text-amber-700 dark:text-amber-300',
  },
  discoverable: {
    label:      'Discoverable',
    dot:        'bg-slate-400',
    activeBg:   'bg-slate-100 dark:bg-slate-800/60',
    activeText: 'text-slate-600 dark:text-slate-300',
  },
}

// ── Collection definitions ────────────────────────────────────────────────────

export const COLLECTION_DEFS = [
  {
    tier:        'actionable' as QualityTier,
    abbr:        'AC',
    iconBg:      'bg-emerald-600',
    title:       'Actionable Contacts',
    description: 'Complete identity profiles with email, direct phone, and LinkedIn — ready for multi-channel outreach with no enrichment required.',
    badge:       'Multi-channel',
    coverage:    'Email · Phone · LinkedIn',
  },
  {
    tier:        'enrichable' as QualityTier,
    abbr:        'EN',
    iconBg:      'bg-amber-500',
    title:       'Enrichable Contacts',
    description: 'Two-signal profiles missing one contact channel. A single Apollo or ZoomInfo pass brings these to Actionable status.',
    badge:       'Needs 1 signal',
    coverage:    'Email · Phone (or LinkedIn)',
  },
  {
    tier:        'discoverable' as QualityTier,
    abbr:        'DS',
    iconBg:      'bg-slate-500',
    title:       'Discoverable Contacts',
    description: 'Single-signal profiles identified from pipeline data. Require full enrichment before multi-channel outreach can begin.',
    badge:       'Full enrichment',
    coverage:    'Single signal',
  },
] as const

// ── Table columns for the contacts table ─────────────────────────────────────

export const TABLE_COLS = [
  'name',
  'email',
  'phone',
  'linkedin_url',
  'company',
  'appearances',
  'last_seen',
] as const

export type TableCol = typeof TABLE_COLS[number]
