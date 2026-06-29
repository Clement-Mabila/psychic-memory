import type { LeadTab } from './types'

export const VERTICALS = ['casino', 'airport', 'hospital', 'transit', 'mall']

export const STAGES = [
  'raw_signal', 'discovery', 'research', 'contact', 'enrichment',
  'qualification', 'sql', 'mql', 'needs_review', 'disqualified',
  'mbody_active', 'human_assigned', 'meeting_booked', 'closed_won', 'closed_lost',
]

export const CONTACT_COLOURS = [
  'bg-indigo-500', 'bg-teal-500', 'bg-pink-500', 'bg-purple-500',
  'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-rose-500',
]

export const EVENT_STYLE: Record<string, string> = {
  pipeline_run:                      'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  stage_transition:                  'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
  human_review:                      'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  manual_edit:                       'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
  company_structure_manual_override: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  crm_sync:                          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  qualification_routed_to_nurture:   'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
}

export const TABS: { id: LeadTab; label: string }[] = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'contacts',  label: 'Contacts'  },
  { id: 'scores',    label: 'Scores'    },
  { id: 'details',   label: 'Details'   },
  { id: 'activity',  label: 'Activity'  },
]
