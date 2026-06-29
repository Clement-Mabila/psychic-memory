'use client'

import { Pencil, Check, Copy, Earth, SwatchBook, AlertCircle, Phone } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { countryName, provinceName } from './geo'
import type { Draft } from './types'

const FOUNDER_TITLES = ['ceo', 'chief executive', 'founder', 'co-founder', 'president', 'owner', 'managing director', 'general manager']


interface Props {
  lead: any
  contacts: any[]
  editing: boolean
  draft: Draft | null
  setField: (k: keyof Draft) => (v: string) => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  saveError: boolean
  copiedDomain: boolean
  onCopyDomain: () => void
  onMissingInfo: () => void
}

export function ProfileCard({
  lead, contacts, editing, draft, setField,
  onEdit, onSave, onCancel,
  isSaving, saveError, copiedDomain, onCopyDomain, onMissingInfo,
}: Props) {
  const location = [lead.hq_city, provinceName(lead.hq_state), countryName(lead.hq_country)].filter(Boolean).join(', ')

  const representative = contacts.find((c: any) => {
    const t = (c.title ?? '').toLowerCase()
    return FOUNDER_TITLES.some(ft => t.includes(ft))
  })
  const linkedInUrl = representative?.linkedin_url ?? null

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-md px-6 pb-5">

      {/* Top row: avatar + action buttons */}
      <div className="flex items-start justify-between">

        <div className="mt-4">
          <Avatar
            name={lead.company_name ?? ''}
            email={lead.domain ?? ''}
            size="xl"
            className="ring-4 ring-white dark:ring-neutral-900 shadow-md"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-3">
          {editing ? (
            <>
              {saveError && <span className="text-xs text-red-500 mr-1">Save failed</span>}
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="h-8 px-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-8 px-4 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Check size={12} />}
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-full border border-gray-200 dark:border-neutral-700 text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Pencil size={11} /> Edit Profile
              </button>
              <button
                onClick={onCopyDomain}
                title="Copy domain"
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-neutral-700 text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {copiedDomain ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Company name */}
      <div className="mt-3 mb-0.5">
        {editing && draft ? (
          <input
            value={draft.company_name}
            onChange={e => setField('company_name')(e.target.value)}
            className="text-base font-semibold text-slate-900 dark:text-slate-100 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/30 w-full"
            placeholder="Company name"
          />
        ) : (
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {lead.company_name ?? '—'}
          </h1>
        )}
      </div>

      {/* Location / domain */}
      {editing && draft ? (
        <div className="flex items-center gap-2 mt-1 mb-3">
          <Earth size={12} className="text-slate-400 flex-shrink-0" />
          <input
            value={draft.domain}
            onChange={e => setField('domain')(e.target.value)}
            className="text-sm text-slate-500 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-blue-500/30 font-mono w-52"
            placeholder="domain.com"
          />
        </div>
      ) : (
        <p className="text-xs mt-1 text-slate-600 dark:text-slate-400 mt-0.5 mb-2.5">
          {location || lead.domain || (
            <span className="italic text-slate-300 dark:text-slate-600 text-xs">No location</span>
          )}
        </p>
      )}

      {/* Description — view mode only */}
      {!editing && lead.qualification_summary && (
        <p className="text-xs text-slate-800 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">
          {lead.qualification_summary}
        </p>
      )}

      {/* Social icon row */}
      <div className="flex items-center gap-2 -ml-1">
        {lead.domain && (
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Earth className="h-3.5 w-3.5" />
          </div>
        )}
        {linkedInUrl && (
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title={representative?.name ? `${representative.name} on LinkedIn` : 'LinkedIn'}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40 hover:opacity-80 transition-opacity"
          >
            <img src="/linkedin.svg" className="h-5 w-5" alt="LinkedIn" />
          </a>
        )}
        {lead.hq_phone && (
          <a
            href={`tel:${lead.hq_phone}`}
            onClick={e => e.stopPropagation()}
            title={lead.hq_phone}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity"
          >
            <Phone className="h-3 w-3" />
          </a>
        )}
        {lead.crm_record_id && (
          <a
            href={`https://app.hubspot.com/contacts/${lead.crm_record_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title="HubSpot CRM"
            className="w-6 h-6 flex items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 hover:opacity-80 transition-opacity"
          >
            <SwatchBook className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={onMissingInfo}
          title="Report missing info"
          className="w-6 h-6 flex items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:opacity-80 transition-opacity"
        >
          <AlertCircle className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
