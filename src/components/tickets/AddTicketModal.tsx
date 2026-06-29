'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, Loader2, Search, ChevronRight, ChevronLeft, Check,
  Building2, User, AlertCircle, CheckSquare, Square, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'
import Cookies from 'js-cookie'

// ── Constants ─────────────────────────────────────────────────────────────────

const TICKET_TYPES = [
  { value: 'general_enquiry',   label: 'General Enquiry'  },
  { value: 'data_request',      label: 'Data Request'     },
  { value: 'bug_report',        label: 'Bug Report'       },
  { value: 'data_removal_gdpr', label: 'GDPR Removal'     },
  { value: 'data_correction',   label: 'Data Correction'  },
  { value: 'access_request',    label: 'Access Request'   },
  { value: 'feature_request',   label: 'Feature Request'  },
  { value: 'missing_info',      label: 'Missing Info'     },
]

const PRIORITIES = [
  { value: 'low',    label: 'Low'    },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High'   },
  { value: 'urgent', label: 'Urgent' },
]

const ROLES = [
  { value: 'viewer',      label: 'Viewer'      },
  { value: 'analyst',     label: 'Analyst'     },
  { value: 'auditor',     label: 'Auditor'     },
  { value: 'admin',       label: 'Admin'       },
  { value: 'super_admin', label: 'Super Admin' },
]

const LEAD_FIELDS = [
  { key: 'hq_city',        label: 'HQ City'        },
  { key: 'hq_state',       label: 'HQ State'       },
  { key: 'hq_country',     label: 'HQ Country'     },
  { key: 'employee_count', label: 'Employee Count'  },
  { key: 'revenue_range',  label: 'Revenue Range'   },
  { key: 'domain',         label: 'Website Domain'  },
]

const CONTACT_FIELDS = [
  { key: 'email',        label: 'Email Address'    },
  { key: 'phone',        label: 'Phone Number'     },
  { key: 'linkedin_url', label: 'LinkedIn Profile' },
  { key: 'title',        label: 'Job Title'        },
]

const BUG_KEYWORDS    = ['broken', 'not working', 'error', 'crash', 'bug', "can't", 'cannot', 'failed', '404', '500']
const ACCESS_KEYWORDS = ['access', 'permission', 'login', 'locked out', 'role']
const DATA_KEYWORDS   = ['missing', 'wrong', 'incorrect', 'update', 'data', 'record']

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalStep =
  | 'base'
  | 'entity-search'
  | 'field-select'
  | 'field-correct'
  | 'missing-fields'
  | 'gdpr-impact'
  | 'bug-fields'
  | 'access-role'
  | 'compose'

interface LeadResult {
  id: string
  company_name: string
  domain: string
  hq_city: string | null
  hq_state: string | null
  hq_country: string | null
  employee_count: number | null
  revenue_range: string | null
}

interface ContactResult {
  id: string
  name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  title: string | null
}

interface FieldEntry {
  key: string
  label: string
  status: 'missing' | 'verify'
  checked: boolean
  scope: 'lead' | 'contact'
}

interface CorrectionEntry {
  key: string
  label: string
  current: string
  proposed: string
  scope: 'lead' | 'contact'
}

interface Draft {
  submitter_email: string
  ticket_type: string
  priority: string
  lead: LeadResult | null
  contact: ContactResult | null
  fields: FieldEntry[]
  corrections: CorrectionEntry[]
  gdprEmail: string
  gdprImpact: { contacts: number; leads: number; email?: string } | null
  gdprConfirmed: boolean
  bugPage: string
  bugExpected: string
  bugActual: string
  bugErrorCode: string
  accessBeneficiary: string
  requestedRole: string
  accessReason: string
  subject: string
  body: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = Cookies.get('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function stepsFor(type: string): ModalStep[] {
  switch (type) {
    case 'data_request':      return ['base', 'entity-search', 'field-select',    'compose']
    case 'data_correction':   return ['base', 'entity-search', 'field-correct',   'compose']
    case 'missing_info':      return ['base', 'entity-search', 'missing-fields',  'compose']
    case 'data_removal_gdpr': return ['base', 'gdpr-impact',   'compose']
    case 'bug_report':        return ['base', 'bug-fields',    'compose']
    case 'access_request':    return ['base', 'access-role',   'compose']
    default:                  return ['base', 'compose']
  }
}

function isMissing(val: unknown): boolean {
  return val === null || val === undefined || val === '' || val === 0
}

function buildFieldEntries(lead: LeadResult, contact: ContactResult | null): FieldEntry[] {
  const entries: FieldEntry[] = []
  for (const f of LEAD_FIELDS) {
    const missing = isMissing((lead as unknown as Record<string, unknown>)[f.key])
    entries.push({ key: f.key, label: f.label, status: missing ? 'missing' : 'verify', checked: missing, scope: 'lead' })
  }
  if (contact) {
    for (const f of CONTACT_FIELDS) {
      const missing = isMissing((contact as unknown as Record<string, unknown>)[f.key])
      entries.push({ key: f.key, label: f.label, status: missing ? 'missing' : 'verify', checked: missing, scope: 'contact' })
    }
  }
  return entries
}

function buildCorrectionEntries(lead: LeadResult, contact: ContactResult | null): CorrectionEntry[] {
  const entries: CorrectionEntry[] = []
  for (const f of LEAD_FIELDS) {
    const val = (lead as unknown as Record<string, unknown>)[f.key]
    entries.push({ key: f.key, label: f.label, current: val != null ? String(val) : '', proposed: '', scope: 'lead' })
  }
  if (contact) {
    for (const f of CONTACT_FIELDS) {
      const val = (contact as unknown as Record<string, unknown>)[f.key]
      entries.push({ key: f.key, label: f.label, current: val != null ? String(val) : '', proposed: '', scope: 'contact' })
    }
  }
  return entries
}

function buildSubjectBody(draft: Draft): { subject: string; body: string } {
  const { ticket_type, lead, contact } = draft
  const entity = lead?.company_name ?? ''
  const domain = lead?.domain ?? ''
  const contactName = contact?.name ?? ''

  switch (ticket_type) {
    case 'data_request': {
      const missingFields = draft.fields.filter(f => f.checked && f.status === 'missing').map(f => f.label)
      const verifyFields  = draft.fields.filter(f => f.checked && f.status === 'verify').map(f => f.label)
      const parts: string[] = [
        `Requesting data for ${entity}${domain ? ` (${domain})` : ''}${contactName ? `, contact: ${contactName}` : ''}.`,
      ]
      if (missingFields.length) parts.push(`\nFields to fill:\n${missingFields.map(l => `  • ${l}`).join('\n')}`)
      if (verifyFields.length)  parts.push(`\nFields for re-verification:\n${verifyFields.map(l => `  • ${l}`).join('\n')}`)
      return { subject: `Data request for ${entity}`, body: parts.join('\n') }
    }
    case 'data_correction': {
      const active = draft.corrections.filter(c => c.proposed.trim())
      const lines  = active.map(c => `  • ${c.label}: "${c.current || '(empty)'}" → "${c.proposed}"`)
      return {
        subject: `Data correction for ${entity}`,
        body: `Corrections for ${entity}${domain ? ` (${domain})` : ''}:\n\n${lines.join('\n')}`,
      }
    }
    case 'missing_info': {
      const missing = draft.fields.filter(f => f.checked).map(f => f.label)
      return {
        subject: `Missing information — ${entity}`,
        body: `The following fields are missing for ${entity}${domain ? ` (${domain})` : ''}:\n\n${missing.map(l => `  • ${l}`).join('\n')}`,
      }
    }
    case 'data_removal_gdpr': {
      const { gdprEmail, gdprImpact } = draft
      const impact = gdprImpact
        ? `Impact: ${gdprImpact.contacts} contact record(s), ${gdprImpact.leads} lead association(s).`
        : ''
      return {
        subject: `GDPR data removal request — ${gdprEmail}`,
        body: `Data removal request submitted for: ${gdprEmail}\n\n${impact}\n\nThis request has been acknowledged under GDPR Article 17 (Right to Erasure).`,
      }
    }
    case 'bug_report':
      return {
        subject: `Bug: ${draft.bugPage}`,
        body: `Location: ${draft.bugPage}\n\nExpected:\n${draft.bugExpected}\n\nActual:\n${draft.bugActual}${draft.bugErrorCode ? `\n\nError code: ${draft.bugErrorCode}` : ''}`,
      }
    case 'access_request':
      return {
        subject: `Access request — ${draft.requestedRole} for ${draft.accessBeneficiary}`,
        body: `Requesting ${draft.requestedRole} access for ${draft.accessBeneficiary}.\n${draft.accessReason ? `\nReason: ${draft.accessReason}` : ''}`,
      }
    default:
      return { subject: draft.subject, body: draft.body }
  }
}

function detectSuggestedType(body: string): string | null {
  const lower = body.toLowerCase()
  if (BUG_KEYWORDS.some(k => lower.includes(k)))   return 'bug_report'
  if (ACCESS_KEYWORDS.some(k => lower.includes(k))) return 'access_request'
  if (DATA_KEYWORDS.some(k => lower.includes(k)))   return 'data_request'
  return null
}

function buildMetadata(draft: Draft): Record<string, unknown> {
  const meta: Record<string, unknown> = {}
  if (draft.lead) {
    meta.lead_id        = draft.lead.id
    meta.company_name   = draft.lead.company_name
    meta.company_domain = draft.lead.domain
  }
  if (draft.contact) meta.contact_id = draft.contact.id

  switch (draft.ticket_type) {
    case 'data_request':
      meta.requested_fields = draft.fields
        .filter(f => f.checked)
        .map(f => ({ field: f.key, label: f.label, status: f.status, scope: f.scope }))
      break
    case 'data_correction':
      meta.corrections = draft.corrections
        .filter(c => c.proposed.trim())
        .map(c => ({ field: c.key, label: c.label, current: c.current, proposed: c.proposed, scope: c.scope }))
      break
    case 'missing_info':
      meta.missing_fields = draft.fields.filter(f => f.checked).map(f => ({ field: f.key, label: f.label, scope: f.scope }))
      break
    case 'data_removal_gdpr':
      meta.gdpr_email  = draft.gdprEmail
      meta.gdpr_impact = draft.gdprImpact
      break
    case 'access_request':
      meta.beneficiary    = draft.accessBeneficiary
      meta.requested_role = draft.requestedRole
      break
  }
  return meta
}

// ── Shared field style ────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-cyan-400 dark:focus:border-cyan-500 transition-colors'
const LABEL_CLS = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5'

// ── Step: Base ────────────────────────────────────────────────────────────────

interface SystemUser {
  id: string
  email: string
  full_name: string
  role: string
  role_display: string
  is_active: boolean
}

function BaseStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const [userSearch, setUserSearch]     = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const usersQuery = useQuery({
    queryKey: ['system-users'],
    queryFn:  () => axios.get('/api/console/security/users', { headers: authHeaders() })
      .then(r => (r.data.users ?? r.data) as SystemUser[]),
    staleTime: 5 * 60_000,
  })

  const allUsers: SystemUser[] = usersQuery.data ?? []
  const filtered = userSearch.trim()
    ? allUsers.filter(u =>
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.full_name ?? '').toLowerCase().includes(userSearch.toLowerCase()),
      )
    : allUsers

  const selectedUser = allUsers.find(u => u.email === draft.submitter_email) ?? null

  const selectUser = (u: SystemUser) => {
    setDraft({ ...draft, submitter_email: u.email })
    setUserSearch('')
    setDropdownOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setDraft({ ...draft, [k]: e.target.value })

  const hints: Record<string, { cls: string; text: string }> = {
    data_request:      { cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',          text: 'Next: search for the company/contact to request data for.' },
    data_correction:   { cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30', text: 'Next: search for the lead/contact with incorrect data.' },
    missing_info:      { cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',      text: 'Next: search for the company with missing fields.' },
    data_removal_gdpr: { cls: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30', text: 'Next: enter the data subject email and check impact.' },
  }
  const hint = hints[draft.ticket_type]

  return (
    <div className="space-y-4">

      {/* Submitter — searchable user picker */}
      <div>
        <label className={LABEL_CLS}>Submitting for <span className="text-red-500">*</span></label>

        <div ref={dropRef}>
            {selectedUser && !dropdownOpen ? (
              <button
                onClick={() => { setDropdownOpen(true); setUserSearch('') }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 text-left hover:border-cyan-300 transition-colors"
              >
                <User size={14} className="text-cyan-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{selectedUser.email}</p>
                  <p className="text-xs text-slate-400 truncate">{selectedUser.role_display ?? selectedUser.role}</p>
                </div>
                <span className="text-xs text-cyan-500 flex-shrink-0">change</span>
              </button>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setDropdownOpen(true) }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search by name or email…"
                  className={cn(INPUT_CLS, 'pl-8')}
                  autoFocus={!selectedUser}
                />
                {usersQuery.isFetching && (
                  <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                )}
              </div>
            )}

            {dropdownOpen && (
              <div className="mt-1 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No users found</p>
                ) : (
                  filtered.map(u => (
                    <button key={u.id} onClick={() => selectUser(u)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors border-b border-slate-50 dark:border-neutral-800 last:border-0',
                        draft.submitter_email === u.email && 'bg-cyan-50 dark:bg-cyan-950/20',
                      )}>
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {u.full_name || u.email}
                        </p>
                        {u.full_name && <p className="text-xs text-slate-400 truncate">{u.email}</p>}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-700 text-slate-500 dark:text-slate-400 flex-shrink-0">
                        {u.role_display ?? u.role}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Type</label>
          <select value={draft.ticket_type} onChange={set('ticket_type')} className={INPUT_CLS}>
            {TICKET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Priority</label>
          <select value={draft.priority} onChange={set('priority')} className={INPUT_CLS}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {hint && (
        <p className={cn('text-xs rounded-xl px-3 py-2', hint.cls)}>{hint.text}</p>
      )}
    </div>
  )
}

// ── Step: Entity Search ───────────────────────────────────────────────────────

function EntitySearchStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedQ = useDebounce(searchInput, 450)

  const leadsQuery = useQuery({
    queryKey: ['lead-search', debouncedQ],
    queryFn:  () => axios.get(`/api/v1/pipeline/leads?q=${encodeURIComponent(debouncedQ)}&page_size=20`,
      { headers: authHeaders() }).then(r => r.data),
    enabled:   debouncedQ.trim().length >= 2,
    staleTime: 30_000,
  })

  const detailQuery = useQuery({
    queryKey: ['lead-detail-modal', draft.lead?.id],
    queryFn:  () => axios.get(`/api/v1/pipeline/leads/${draft.lead!.id}`,
      { headers: authHeaders() }).then(r => r.data),
    enabled:   !!draft.lead?.id,
    staleTime: 60_000,
  })

  const contactsQuery = useQuery({
    queryKey: ['lead-modal-contacts', draft.lead?.id],
    queryFn:  () => axios.get(`/api/v1/pipeline/leads/${draft.lead!.id}/contacts`,
      { headers: authHeaders() }).then(r => r.data),
    enabled:   !!draft.lead?.id,
    staleTime: 60_000,
  })

  const leads: LeadResult[]       = leadsQuery.data?.results ?? []
  const contacts: ContactResult[] = contactsQuery.data?.results ?? []

  const prevDetailId = useRef<string | null>(null)
  useEffect(() => {
    if (detailQuery.data && draft.lead?.id && draft.lead.id !== prevDetailId.current) {
      prevDetailId.current = draft.lead.id
      setDraft({ ...draft, lead: detailQuery.data })
    }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectLead = (lead: LeadResult) => {
    setDraft({ ...draft, lead, contact: null, fields: [], corrections: [] })
  }

  const handleSelectContact = (c: ContactResult | null) => {
    setDraft({ ...draft, contact: c })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>Search company or domain</label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="e.g. Marriott, marriott.com…" className={cn(INPUT_CLS, 'pl-8')} autoFocus />
          {leadsQuery.isFetching && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
          )}
        </div>
      </div>

      {leads.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {leads.slice(0, 8).map(lead => (
            <button key={lead.id} onClick={() => handleSelectLead(lead)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors border',
                draft.lead?.id === lead.id
                  ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800'
                  : 'border-transparent hover:bg-slate-50 dark:hover:bg-neutral-800',
              )}>
              <Building2 size={14} className={cn('flex-shrink-0', draft.lead?.id === lead.id ? 'text-cyan-500' : 'text-slate-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{lead.company_name}</p>
                <p className="text-xs text-slate-400 truncate">{lead.domain}</p>
              </div>
              {draft.lead?.id === lead.id && <Check size={13} className="text-cyan-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {debouncedQ.length >= 2 && !leadsQuery.isFetching && leads.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">No leads found for "{debouncedQ}"</p>
      )}

      {draft.lead && (
        <div>
          <label className={LABEL_CLS}>Contact <span className="text-slate-400 font-normal">(optional)</span></label>
          {contactsQuery.isFetching ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-1.5">
              <Loader2 size={12} className="animate-spin" /> Loading contacts…
            </div>
          ) : (
            <div className="space-y-1 max-h-44 overflow-y-auto">
              <button onClick={() => handleSelectContact(null)}
                className={cn(
                  'w-full flex items-center px-3 py-2 rounded-xl text-left border transition-colors',
                  !draft.contact
                    ? 'bg-slate-100 dark:bg-neutral-700 border-slate-200 dark:border-neutral-600'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-neutral-800',
                )}>
                <span className="text-xs text-slate-500 dark:text-slate-400 italic">Company-level only</span>
              </button>
              {contacts.map(c => (
                <button key={c.id} onClick={() => handleSelectContact(c)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border transition-colors',
                    draft.contact?.id === c.id
                      ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-neutral-800',
                  )}>
                  <User size={13} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">{c.title ?? c.email ?? '—'}</p>
                  </div>
                  {draft.contact?.id === c.id && <Check size={13} className="text-cyan-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step: Field Select ────────────────────────────────────────────────────────

function FieldSelectStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const toggle = (key: string, scope: string) => {
    setDraft({
      ...draft,
      fields: draft.fields.map(f =>
        f.key === key && f.scope === scope ? { ...f, checked: !f.checked } : f,
      ),
    })
  }

  const FieldRow = ({ f }: { f: FieldEntry }) => (
    <button onClick={() => toggle(f.key, f.scope)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors text-left">
      {f.checked
        ? <CheckSquare size={14} className="text-cyan-500 flex-shrink-0" />
        : <Square size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />}
      <span className={cn('text-sm flex-1', f.checked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400')}>
        {f.label}
      </span>
      <span className={cn(
        'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
        f.status === 'missing'
          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
          : 'bg-slate-100 dark:bg-neutral-700 text-slate-500 dark:text-slate-400',
      )}>
        {f.status === 'missing' ? 'to fill' : 're-verify'}
      </span>
    </button>
  )

  const leadFields    = draft.fields.filter(f => f.scope === 'lead')
  const contactFields = draft.fields.filter(f => f.scope === 'contact')

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Select fields for <strong className="text-slate-900 dark:text-slate-100">{draft.lead?.company_name}</strong>.
        Amber = missing data · Gray = re-verification needed.
      </p>
      {leadFields.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-0.5">Company</p>
          <div className="divide-y divide-slate-50 dark:divide-neutral-800">
            {leadFields.map(f => <FieldRow key={`${f.scope}-${f.key}`} f={f} />)}
          </div>
        </div>
      )}
      {contactFields.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-0.5">
            Contact — {draft.contact?.name}
          </p>
          <div className="divide-y divide-slate-50 dark:divide-neutral-800">
            {contactFields.map(f => <FieldRow key={`${f.scope}-${f.key}`} f={f} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step: Field Correct ───────────────────────────────────────────────────────

function FieldCorrectStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const setProposed = (key: string, scope: string, val: string) =>
    setDraft({
      ...draft,
      corrections: draft.corrections.map(c =>
        c.key === key && c.scope === scope ? { ...c, proposed: val } : c,
      ),
    })

  const CorrRow = ({ c }: { c: CorrectionEntry }) => (
    <div className="py-2.5 border-b border-slate-50 dark:border-neutral-800 last:border-0">
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">{c.label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
        Current: <span className="font-mono">{c.current || <em className="not-italic text-slate-300">empty</em>}</span>
      </p>
      <input type="text" value={c.proposed} onChange={e => setProposed(c.key, c.scope, e.target.value)}
        placeholder="Proposed correction…" className={cn(INPUT_CLS, 'py-1.5')} />
    </div>
  )

  const leadCorr    = draft.corrections.filter(c => c.scope === 'lead')
  const contactCorr = draft.corrections.filter(c => c.scope === 'contact')

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Enter corrections for <strong className="text-slate-900 dark:text-slate-100">{draft.lead?.company_name}</strong>. Leave blank to skip.
      </p>
      {leadCorr.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Company</p>
          {leadCorr.map(c => <CorrRow key={`${c.scope}-${c.key}`} c={c} />)}
        </div>
      )}
      {contactCorr.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Contact — {draft.contact?.name}
          </p>
          {contactCorr.map(c => <CorrRow key={`${c.scope}-${c.key}`} c={c} />)}
        </div>
      )}
    </div>
  )
}

// ── Step: Missing Fields ──────────────────────────────────────────────────────

function MissingFieldsStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const toggle = (key: string, scope: string) =>
    setDraft({
      ...draft,
      fields: draft.fields.map(f =>
        f.key === key && f.scope === scope ? { ...f, checked: !f.checked } : f,
      ),
    })

  const missingOnly = draft.fields.filter(f => f.status === 'missing')

  if (missingOnly.length === 0) {
    return (
      <div className="text-center py-6">
        <Check size={28} className="text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">All fields complete</p>
        <p className="text-xs text-slate-400 mt-1">No missing data detected for {draft.lead?.company_name}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Missing fields for <strong className="text-slate-900 dark:text-slate-100">{draft.lead?.company_name}</strong>. Uncheck any to exclude.
      </p>
      <div className="divide-y divide-slate-50 dark:divide-neutral-800">
        {missingOnly.map(f => (
          <button key={`${f.scope}-${f.key}`} onClick={() => toggle(f.key, f.scope)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left">
            {f.checked
              ? <CheckSquare size={14} className="text-amber-500 flex-shrink-0" />
              : <Square size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />}
            <span className={cn('text-sm flex-1', f.checked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500')}>{f.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-700 text-slate-500 dark:text-slate-400 flex-shrink-0">
              {f.scope}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step: GDPR Impact ─────────────────────────────────────────────────────────

function GdprImpactStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const [checking, setChecking] = useState(false)

  const checkImpact = async () => {
    if (!draft.gdprEmail.trim()) return
    setChecking(true)
    try {
      const { data } = await axios.get(
        `/api/tickets/gdpr-impact/?email=${encodeURIComponent(draft.gdprEmail.trim())}`,
        { headers: authHeaders() },
      )
      setDraft({ ...draft, gdprImpact: data, gdprConfirmed: false })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
        <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-orange-700 dark:text-orange-300">
          GDPR removal permanently erases the data subject's records. Verify impact before confirming.
        </p>
      </div>

      <div>
        <label className={LABEL_CLS}>Data subject email <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          <input type="email" value={draft.gdprEmail}
            onChange={e => setDraft({ ...draft, gdprEmail: e.target.value, gdprImpact: null, gdprConfirmed: false })}
            placeholder="subject@example.com" className={cn(INPUT_CLS, 'flex-1')} />
          <button onClick={checkImpact} disabled={!draft.gdprEmail.trim() || checking}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-xl transition-colors flex-shrink-0 flex items-center gap-1',
              draft.gdprEmail.trim() && !checking
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100'
                : 'bg-slate-200 dark:bg-neutral-700 text-slate-400 cursor-not-allowed',
            )}>
            {checking ? <Loader2 size={13} className="animate-spin" /> : 'Check'}
          </button>
        </div>
      </div>

      {draft.gdprImpact && (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Impact for <span className="font-mono">{draft.gdprEmail}</span>
          </p>
          <div className="flex gap-6">
            <div>
              <p className={cn('text-2xl font-bold', draft.gdprImpact.contacts > 0 ? 'text-orange-500' : 'text-emerald-500')}>
                {draft.gdprImpact.contacts}
              </p>
              <p className="text-xs text-slate-400">contact record{draft.gdprImpact.contacts !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className={cn('text-2xl font-bold', draft.gdprImpact.leads > 0 ? 'text-orange-500' : 'text-emerald-500')}>
                {draft.gdprImpact.leads}
              </p>
              <p className="text-xs text-slate-400">lead association{draft.gdprImpact.leads !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <label className="flex items-start gap-2 cursor-pointer pt-2 border-t border-slate-100 dark:border-neutral-800">
            <input type="checkbox" checked={draft.gdprConfirmed}
              onChange={e => setDraft({ ...draft, gdprConfirmed: e.target.checked })}
              className="mt-0.5 accent-orange-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              I confirm this is a valid GDPR Article 17 erasure request and the above records should be removed.
            </span>
          </label>
        </div>
      )}
    </div>
  )
}

// ── Step: Bug Fields ──────────────────────────────────────────────────────────

function BugFieldsStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft({ ...draft, [k]: e.target.value })

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>Where did this happen? <span className="text-red-500">*</span></label>
        <input type="text" value={draft.bugPage} onChange={set('bugPage')}
          placeholder="e.g. Leads page / Kanban view / Login" className={INPUT_CLS} />
      </div>
      <div>
        <label className={LABEL_CLS}>What should have happened? <span className="text-red-500">*</span></label>
        <textarea rows={2} value={draft.bugExpected} onChange={set('bugExpected')}
          placeholder="Expected behavior…" className={cn(INPUT_CLS, 'resize-none')} />
      </div>
      <div>
        <label className={LABEL_CLS}>What actually happened? <span className="text-red-500">*</span></label>
        <textarea rows={2} value={draft.bugActual} onChange={set('bugActual')}
          placeholder="Actual behavior…" className={cn(INPUT_CLS, 'resize-none')} />
      </div>
      <div>
        <label className={LABEL_CLS}>Error code <span className="text-slate-400 font-normal">(optional)</span></label>
        <input type="text" value={draft.bugErrorCode} onChange={set('bugErrorCode')}
          placeholder="500, TypeError, ECONNREFUSED…" className={INPUT_CLS} />
      </div>
    </div>
  )
}

// ── Step: Access Role ─────────────────────────────────────────────────────────

function AccessRoleStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const set = (k: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setDraft({ ...draft, [k]: e.target.value })

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>Who needs access? <span className="text-red-500">*</span></label>
        <input type="email" value={draft.accessBeneficiary} onChange={set('accessBeneficiary')}
          placeholder="user@company.com" className={INPUT_CLS} />
      </div>
      <div>
        <label className={LABEL_CLS}>Requested role <span className="text-red-500">*</span></label>
        <select value={draft.requestedRole} onChange={set('requestedRole')} className={INPUT_CLS}>
          <option value="">Select role…</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL_CLS}>Reason <span className="text-slate-400 font-normal">(optional)</span></label>
        <textarea rows={2} value={draft.accessReason} onChange={set('accessReason')}
          placeholder="Why is this access level needed?" className={cn(INPUT_CLS, 'resize-none')} />
      </div>
    </div>
  )
}

// ── Step: Compose ─────────────────────────────────────────────────────────────

function ComposeStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft({ ...draft, [k]: e.target.value })

  const suggestedType = draft.ticket_type === 'general_enquiry'
    ? detectSuggestedType(draft.body)
    : null

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>Subject <span className="text-red-500">*</span></label>
        <input type="text" value={draft.subject} onChange={set('subject')}
          placeholder="Brief description" maxLength={200} className={INPUT_CLS} />
      </div>
      <div>
        <label className={LABEL_CLS}>Description <span className="text-red-500">*</span></label>
        <textarea rows={7} value={draft.body} onChange={set('body')}
          placeholder="Full details…" className={cn(INPUT_CLS, 'resize-none')} />
      </div>

      {suggestedType && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
          <AlertCircle size={13} className="text-violet-500 flex-shrink-0" />
          <p className="text-xs text-violet-700 dark:text-violet-300 flex-1">
            This looks like a <strong>{TICKET_TYPES.find(t => t.value === suggestedType)?.label}</strong> — switch type?
          </p>
          <button onClick={() => setDraft({ ...draft, ticket_type: suggestedType! })}
            className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline flex-shrink-0">
            Switch
          </button>
        </div>
      )}
    </div>
  )
}

// ── AddTicketModal ────────────────────────────────────────────────────────────

const EMPTY_DRAFT: Draft = {
  submitter_email:   '',
  ticket_type:       'general_enquiry',
  priority:          'medium',
  lead:              null,
  contact:           null,
  fields:            [],
  corrections:       [],
  gdprEmail:         '',
  gdprImpact:        null,
  gdprConfirmed:     false,
  bugPage:           '',
  bugExpected:       '',
  bugActual:         '',
  bugErrorCode:      '',
  accessBeneficiary: '',
  requestedRole:     '',
  accessReason:      '',
  subject:           '',
  body:              '',
}

export interface AddTicketModalProps {
  onClose: () => void
  prefillType?: string
  prefillEntity?: { lead_id: string; domain: string; company_name: string }
}

export function AddTicketModal({ onClose, prefillType, prefillEntity }: AddTicketModalProps) {
  const qc = useQueryClient()

  const [draft, setDraft] = useState<Draft>(() => ({
    ...EMPTY_DRAFT,
    ticket_type: prefillType ?? 'general_enquiry',
    lead: prefillEntity
      ? {
          id: prefillEntity.lead_id,
          company_name: prefillEntity.company_name,
          domain: prefillEntity.domain,
          hq_city: null, hq_state: null, hq_country: null,
          employee_count: null, revenue_range: null,
        }
      : null,
  }))

  const steps = stepsFor(draft.ticket_type)

  // When prefillEntity provided for an entity-type, skip straight past entity-search
  const [stepIndex, setStepIndex] = useState(() => {
    if (prefillEntity && stepsFor(prefillType ?? 'general_enquiry').includes('entity-search')) {
      const idx = stepsFor(prefillType ?? 'general_enquiry').indexOf('entity-search')
      return idx + 1
    }
    return 0
  })

  const currentStep = steps[stepIndex] as ModalStep
  const isLast      = stepIndex === steps.length - 1

  const prevTypeRef = useRef(draft.ticket_type)
  useEffect(() => {
    if (draft.ticket_type !== prevTypeRef.current) {
      prevTypeRef.current = draft.ticket_type
      setStepIndex(0)
    }
  }, [draft.ticket_type])

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 'base':          return !!draft.submitter_email.trim()
      case 'entity-search': return !!draft.lead
      case 'field-select':  return draft.fields.some(f => f.checked)
      case 'field-correct': return draft.corrections.some(c => c.proposed.trim())
      case 'missing-fields':return draft.fields.some(f => f.checked)
      case 'gdpr-impact':   return !!draft.gdprEmail.trim() && !!draft.gdprImpact && draft.gdprConfirmed
      case 'bug-fields':    return !!draft.bugPage.trim() && !!draft.bugExpected.trim() && !!draft.bugActual.trim()
      case 'access-role':   return !!draft.accessBeneficiary.trim() && !!draft.requestedRole
      case 'compose':       return !!draft.subject.trim() && !!draft.body.trim()
      default:              return true
    }
  }

  const handleNext = () => {
    const nextIndex = stepIndex + 1
    const nextStep  = steps[nextIndex]
    let updated     = { ...draft }

    if (currentStep === 'entity-search' && updated.lead) {
      if (draft.ticket_type === 'data_correction') {
        updated.corrections = buildCorrectionEntries(updated.lead, updated.contact)
      } else {
        updated.fields = buildFieldEntries(updated.lead, updated.contact)
      }
    }

    if (nextStep === 'compose' && draft.ticket_type !== 'general_enquiry' && draft.ticket_type !== 'feature_request') {
      const { subject, body } = buildSubjectBody(updated)
      updated.subject = subject
      updated.body    = body
    }

    setDraft(updated)
    setStepIndex(nextIndex)
  }

  const mutation = useMutation({
    mutationFn: () =>
      axios.post('/api/tickets', {
        submitter_email: draft.submitter_email,
        ticket_type:     draft.ticket_type,
        priority:        draft.priority,
        subject:         draft.subject,
        body:            draft.body,
        metadata:        buildMetadata(draft),
      }, { headers: authHeaders() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-list'] })
      onClose()
    },
  })

  const STEP_LABELS: Record<string, string> = {
    'base':           'Details',
    'entity-search':  'Find Entity',
    'field-select':   'Select Fields',
    'field-correct':  'Enter Corrections',
    'missing-fields': 'Missing Fields',
    'gdpr-impact':    'Impact Check',
    'bug-fields':     'Bug Details',
    'access-role':    'Access Details',
    'compose':        'Review',
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-neutral-800 flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex-shrink-0 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">New Ticket</h2>
              {steps.length > 1 && (
                <div className="flex items-center gap-0.5 mt-2 mb-1">
                  {steps.map((_, i) => (
                    <div key={i} className={cn(
                      'h-1 rounded-full flex-1 transition-all',
                      i < stepIndex  ? 'bg-cyan-400'
                      : i === stepIndex ? 'bg-cyan-500'
                      : 'bg-slate-100 dark:bg-neutral-700',
                    )} />
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Step {stepIndex + 1} of {steps.length} — {STEP_LABELS[currentStep]}
              </p>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors flex-shrink-0 mt-0.5">
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {currentStep === 'base'           && <BaseStep draft={draft} setDraft={setDraft} />}
            {currentStep === 'entity-search'  && <EntitySearchStep draft={draft} setDraft={setDraft} />}
            {currentStep === 'field-select'   && <FieldSelectStep draft={draft} setDraft={setDraft} />}
            {currentStep === 'field-correct'  && <FieldCorrectStep draft={draft} setDraft={setDraft} />}
            {currentStep === 'missing-fields' && <MissingFieldsStep draft={draft} setDraft={setDraft} />}
            {currentStep === 'gdpr-impact'    && <GdprImpactStep draft={draft} setDraft={setDraft} />}
            {currentStep === 'bug-fields'     && <BugFieldsStep draft={draft} setDraft={setDraft} />}
            {currentStep === 'access-role'    && <AccessRoleStep draft={draft} setDraft={setDraft} />}
            {currentStep === 'compose'        && <ComposeStep draft={draft} setDraft={setDraft} />}

            {mutation.isError && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-4">Failed to create ticket — please try again.</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-100 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-1">
              {stepIndex > 0 && (
                <button onClick={() => setStepIndex(i => i - 1)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                  <ChevronLeft size={14} /> Back
                </button>
              )}
              <button onClick={onClose}
                className="px-3 py-2 text-sm rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                Cancel
              </button>
            </div>

            {isLast ? (
              <button onClick={() => mutation.mutate()} disabled={!canAdvance() || mutation.isPending}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors',
                  canAdvance() && !mutation.isPending
                    ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                    : 'bg-slate-200 dark:bg-neutral-700 text-slate-400 cursor-not-allowed',
                )}>
                {mutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Creating…</>
                  : 'Create Ticket'}
              </button>
            ) : (
              <button onClick={handleNext} disabled={!canAdvance()}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors',
                  canAdvance()
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200'
                    : 'bg-slate-200 dark:bg-neutral-700 text-slate-400 cursor-not-allowed',
                )}>
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
