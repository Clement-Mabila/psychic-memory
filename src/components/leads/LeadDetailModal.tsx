'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { leadApi } from '@/lib/api'
import { AddTicketModal } from '@/components/tickets/AddTicketModal'

import { ProfileCard } from './lead-detail/ProfileCard'
import { TabNav }      from './lead-detail/TabNav'
import { Sidebar }     from './lead-detail/Sidebar'
import { OverviewTab } from './lead-detail/tabs/OverviewTab'
import { ContactsTab } from './lead-detail/tabs/ContactsTab'
import { ScoresTab }   from './lead-detail/tabs/ScoresTab'
import { DetailsTab }  from './lead-detail/tabs/DetailsTab'
import { ActivityTab } from './lead-detail/tabs/ActivityTab'
import { buildDraft }  from './lead-detail/utils'
import type { LeadTab, Draft, LeadDetailModalProps } from './lead-detail/types'

export default function LeadDetailModal({
  leadId, onClose, onRun: _onRun, onRerun: _onRerun, onRunOnly: _onRunOnly,
}: LeadDetailModalProps) {
  const qc = useQueryClient()

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead-detail', leadId],
    queryFn:  () => leadApi.getDetail(leadId),
    staleTime: 15_000,
  })

  const [tab,             setTab]            = useState<LeadTab>('overview')
  const [editing,         setEditing]        = useState(false)
  const [draft,           setDraft]          = useState<Draft | null>(null)
  const [copiedDomain,    setCopiedDomain]   = useState(false)
  const [missingInfoOpen, setMissingInfoOpen] = useState(false)

  useEffect(() => {
    if (lead && !editing) setDraft(buildDraft(lead))
  }, [lead]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => leadApi.update(leadId, data),
    onSuccess: (updated) => {
      qc.setQueryData(['lead-detail', leadId], updated)
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['leads-kanban'] })
      setDraft(buildDraft(updated))
      setEditing(false)
    },
  })

  const setField = (key: keyof Draft) => (value: string) =>
    setDraft(d => d ? { ...d, [key]: value } : d)

  const handleSave = () => {
    if (!lead || !draft) return
    const orig = buildDraft(lead)
    const changes: Record<string, any> = {}
    ;(Object.keys(draft) as (keyof Draft)[]).forEach(k => {
      if (draft[k] !== orig[k]) {
        changes[k] = k === 'employee_count'
          ? (draft[k] === '' ? null : parseInt(draft[k], 10) || null)
          : (draft[k] === '' ? null : draft[k])
      }
    })
    if (Object.keys(changes).length > 0) updateMutation.mutate(changes)
    else setEditing(false)
  }

  const handleCancel = () => { if (lead) setDraft(buildDraft(lead)); setEditing(false) }
  const handleEdit   = () => { setEditing(true); setTab('details') }

  const copyDomain = () => {
    if (lead?.domain) {
      navigator.clipboard.writeText(lead.domain)
      setCopiedDomain(true)
      setTimeout(() => setCopiedDomain(false), 1500)
    }
  }

  const contacts  = lead?.contacts        ?? []
  const events    = [...(lead?.events ?? [])].reverse().slice(0, 8)
  const agentRuns = lead?.agent_executions ?? []
  const totalCost = agentRuns.reduce((s: number, ae: any) => s + (ae.cost_usd ?? 0), 0)

  return (<>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/*
       * Outer shell — position:relative so the close button can be
       * absolute and always visible, even when the inner content scrolls.
       */}
      <div
        className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button — absolutely on the shell so it never scrolls away */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900/80 text-slate-700 dark:text-slate-300 shadow hover:bg-white dark:hover:bg-neutral-900 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        {/*
         * Single scroll container — hero and all content live here together.
         * Because they share the same scroll context, the -mt-16 on the
         * content grid correctly overlaps the hero image (no clipping).
         */}
        <div className="max-h-[90vh] overflow-y-auto overscroll-contain bg-[#f9fafb] dark:bg-neutral-950">

          {/* Hero image */}
          <div
            className="h-40 w-full flex-shrink-0"
            style={{ backgroundImage: 'url(/herobg.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          />

          {/*
           * Content grid — -mt-16 pulls it 64 px up, so both the left
           * ProfileCard and the right Sidebar start at the same vertical
           * level, both overlapping the bottom portion of the hero.
           */}
          <div className="relative z-10 px-5 pb-8">

            {isLoading ? (
              <div className="flex flex-col gap-3 pt-20 animate-pulse">
                {[70, 50, 90, 60].map((w, i) => (
                  <div key={i} className="h-4 bg-gray-200 dark:bg-neutral-800 rounded-lg" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : !lead ? (
              <div className="pt-24 text-center text-sm text-gray-400 dark:text-slate-500">
                Failed to load lead
              </div>
            ) : (
              /* Two-column grid — left and right start at IDENTICAL vertical positions */
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_315px] gap-5 items-start">

                {/* ── Left column ─────────────────────────────────────── */}
                <div className="-mt-16 flex flex-col gap-3">

                  {/* Profile card — avatar's -mt-8 bleeds into the hero above */}
                  <ProfileCard
                    lead={lead}
                    contacts={contacts}
                    editing={editing}
                    draft={draft}
                    setField={setField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSaving={updateMutation.isPending}
                    saveError={updateMutation.isError}
                    copiedDomain={copiedDomain}
                    onCopyDomain={copyDomain}
                    onMissingInfo={() => setMissingInfoOpen(true)}
                  />

                  {/* Tab navigation — floating below the profile card */}
                  <TabNav active={tab} onChange={setTab} />

                  {/* Tab content card */}
                  <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm p-6">
                    {tab === 'overview' && <OverviewTab lead={lead} contacts={contacts} events={events} onTabChange={setTab} />}
                    {tab === 'contacts' && <ContactsTab contacts={contacts} />}
                    {tab === 'scores'   && <ScoresTab   lead={lead} editing={editing} draft={draft} setField={setField} />}
                    {tab === 'details'  && <DetailsTab  lead={lead} editing={editing} draft={draft} setField={setField} />}
                    {tab === 'activity' && <ActivityTab events={events} agentRuns={agentRuns} totalCost={totalCost} />}
                  </div>

                </div>

                {/* ── Right column ─────────────────────────────────────── */}
                <div className="pt-4">
                  <Sidebar lead={lead} />
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {missingInfoOpen && lead && (
      <AddTicketModal
        onClose={() => setMissingInfoOpen(false)}
        prefillType="missing_info"
        prefillEntity={{ lead_id: leadId, domain: lead.domain ?? '', company_name: lead.company_name ?? '' }}
      />
    )}
  </>)
}
