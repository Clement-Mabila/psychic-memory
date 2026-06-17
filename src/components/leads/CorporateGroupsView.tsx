'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Users, Building2, Loader2,
  Play, RotateCcw, UserCheck, ArrowRight, PlusCircle,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import CompanyAvatar from './CompanyAvatar'
import AddSubsidiaryModal from './AddSubsidiaryModal'

interface Group {
  id: string
  name: string
  root_domain: string
  description?: string
  member_count: number
  created: string
}

interface Contact {
  id: string
  name: string
  title: string
  email: string
  email_verified: boolean
  linkedin_url: string | null
}

interface Member {
  id: string
  company_name: string
  domain: string
  lifecycle_stage: string
  qualification_score: number | null
  hq_city?: string
  hq_state?: string
  contact_count: number
  contacts: Contact[]
}

const STAGE_COLOR: Record<string, string> = {
  sql:           'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  mql:           'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  qualification: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
  enrichment:    'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  contact:       'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  research:      'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  discovery:     'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-slate-400',
  raw_signal:    'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-slate-400',
  disqualified:  'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
}

const RUNNABLE = new Set(['raw_signal', 'discovery', 'research', 'contact', 'enrichment', 'qualification', 'needs_review'])

function MemberRow({ member, groupId }: { member: Member; groupId: string }) {
  const [showContacts, setShowContacts] = useState(false)
  const [runState, setRunState]         = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const qc = useQueryClient()

  const isEarlyStage = member.lifecycle_stage === 'raw_signal' || member.lifecycle_stage === 'discovery'

  const handleRun = async () => {
    setRunState('running')
    try {
      await api.post(`/leads/${member.id}/run`)
      setRunState('done')
      qc.invalidateQueries({ queryKey: ['group-members', groupId] })
      setTimeout(() => setRunState('idle'), 3000)
    } catch {
      setRunState('error')
      setTimeout(() => setRunState('idle'), 3000)
    }
  }

  return (
    <div className="border-t border-gray-50 dark:border-slate-800/60">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <CompanyAvatar domain={member.domain} name={member.company_name} size="sm" />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">{member.company_name}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{member.domain}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Contact count — clickable */}
          {member.contact_count > 0 && (
            <button
              onClick={() => setShowContacts(v => !v)}
              className={cn(
                'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors',
                showContacts
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500'
              )}
            >
              <UserCheck size={9} />
              {member.contact_count}
            </button>
          )}

          {/* Stage pill */}
          {member.lifecycle_stage && (
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium capitalize',
              STAGE_COLOR[member.lifecycle_stage] ?? 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
            )}>
              {member.lifecycle_stage.replace(/_/g, ' ')}
            </span>
          )}

          {/* Score */}
          {member.qualification_score != null && (
            <span className={cn(
              'text-xs font-bold',
              member.qualification_score >= 55 ? 'text-emerald-600 dark:text-emerald-400'
              : member.qualification_score >= 30 ? 'text-amber-500 dark:text-amber-400'
              : 'text-red-500 dark:text-red-400'
            )}>
              {member.qualification_score}
            </span>
          )}

          {/* Run / Rerun button */}
          {RUNNABLE.has(member.lifecycle_stage) && (
            <button
              onClick={handleRun}
              disabled={runState === 'running'}
              title={isEarlyStage ? 'Run pipeline' : 'Rerun from current stage'}
              className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                runState === 'done'    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                : runState === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                : runState === 'running' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500'
              )}
            >
              {runState === 'running' ? (
                <Loader2 size={10} className="animate-spin" />
              ) : isEarlyStage ? (
                <Play size={10} />
              ) : (
                <RotateCcw size={10} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Contact preview — shown when badge clicked */}
      {showContacts && member.contacts.length > 0 && (
        <div className="mx-4 mb-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl overflow-hidden">
          {member.contacts.map((c, i) => (
            <div
              key={c.id}
              className={cn(
                'flex items-start gap-2.5 px-3 py-2',
                i > 0 && 'border-t border-gray-100 dark:border-neutral-700/50'
              )}
            >
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                  {(c.name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-700 dark:text-slate-300 truncate">{c.name}</p>
                {c.title && (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">{c.title}</p>
                )}
                {c.email && (
                  <p className={cn(
                    'text-[10px] truncate font-mono',
                    c.email_verified
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-400 dark:text-slate-500'
                  )}>
                    {c.email}
                    {c.email_verified && <span className="ml-1 text-[9px]">✓</span>}
                  </p>
                )}
              </div>
            </div>
          ))}
          {member.contact_count > 3 && (
            <a
              href={`/leads/${member.id}`}
              className="flex items-center justify-center gap-1 px-3 py-1.5 border-t border-gray-100 dark:border-neutral-700/50 text-[10px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
            >
              See all {member.contact_count} contacts <ArrowRight size={9} />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group }: { group: Group }) {
  const [expanded,    setExpanded]    = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const qc = useQueryClient()

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () =>
      api.get(`/corporate-groups/${group.id}/members`).then(r =>
        Array.isArray(r.data) ? r.data : (r.data?.results ?? [])
      ) as Promise<Member[]>,
    enabled: expanded,
    staleTime: 60_000,
  })

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-shadow hover:shadow-sm">
        {/* Card header */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-4 px-4 py-4 text-left"
        >
          <CompanyAvatar domain={group.root_domain} name={group.name} size="md" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{group.name}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate font-mono">{group.root_domain}</p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500">
              <Users size={11} />
              <span>{group.member_count}</span>
            </div>
            <div className="text-gray-300 dark:text-neutral-600">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
        </button>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-slate-800">
            {loadingMembers && (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                <Loader2 size={12} className="animate-spin" /> Loading subsidiaries…
              </div>
            )}

            {!loadingMembers && (members ?? []).length === 0 && (
              <div className="py-6 text-center text-xs text-gray-400 dark:text-slate-500">
                No subsidiaries linked yet
              </div>
            )}

            {(members ?? []).map(m => (
              <MemberRow key={m.id} member={m} groupId={group.id} />
            ))}

            {/* Footer — Add Subsidiary */}
            <div className="px-4 py-3 border-t border-gray-50 dark:border-slate-800/60">
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors font-medium"
              >
                <PlusCircle size={12} />
                Add Subsidiary
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddSubsidiaryModal
          group={group}
          onClose={() => setShowAddModal(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['group-members', group.id] })
            qc.invalidateQueries({ queryKey: ['corporate-groups'] })
          }}
        />
      )}
    </>
  )
}

interface Props {
  search: string
}

export default function CorporateGroupsView({ search }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['corporate-groups', search],
    queryFn: () =>
      api.get('/corporate-groups', { params: { q: search || undefined } })
        .then(r => (Array.isArray(r.data) ? r.data : (r.data?.results ?? [])) as Group[]),
    staleTime: 30_000,
  })

  const groups = data ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-sm text-gray-400 dark:text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Loading groups…
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
          <Building2 size={20} className="text-gray-400 dark:text-slate-500" />
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {search ? `No groups matching "${search}"` : 'No corporate groups yet'}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500">
          Create one using the + button above
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g: Group) => (
        <GroupCard key={g.id} group={g} />
      ))}
    </div>
  )
}
