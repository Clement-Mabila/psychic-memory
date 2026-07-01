'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import CompanyAvatar from '@/components/leads/CompanyAvatar'
import { CardShell, Skel, StagePill, SLOTS } from './shared'

// Mirrors DescriptionWithMore in LeadCard — truncates to 2 lines, "see more" sits
// at absolute bottom-right overlapping the ellipsis and links to the Groups tab.
function DescriptionLink({ text }: { text: string }) {
  return (
    <div className="relative">
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
        {text}
      </p>
      <Link
        href="/leads?view=groups"
        className="absolute bottom-0.5 right-0 text-blue-500 dark:text-blue-400 text-xs font-medium bg-white dark:bg-neutral-900 pl-1 hover:underline"
      >
        see more
      </Link>
    </div>
  )
}

interface CorporateGroup {
  id:                 string
  name:               string
  root_domain:        string | null
  description:        string | null
  member_count:       number
  dominant_vertical:  string | null
  effective_priority: 'low' | 'medium' | 'high'
}

interface Member {
  id:                  string
  company_name:        string
  domain:              string
  lifecycle_stage:     string
  hq_city:             string | null
  qualification_score: number | null
}

function GroupMembers({ groupId, accentBar }: { groupId: string; accentBar: string }) {
  const { data, isLoading } = useQuery<Member[]>({
    queryKey: ['group-members', groupId],
    queryFn: () =>
      api.get(`/corporate-groups/${groupId}/members`)
        .then(r => (Array.isArray(r.data) ? r.data : (r.data?.results ?? [])) as Member[]),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2 py-1">
        {[0, 1, 2].map(i => <Skel key={i} className="h-3 w-full" />)}
      </div>
    )
  }

  const members = (data ?? []).slice(0, 6)
  if (members.length === 0) {
    return <p className="py-1 text-xs text-slate-400 dark:text-slate-500">No members found</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {members.map(m => (
        <div key={m.id} className="flex items-center gap-2">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', accentBar)} />
          <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate min-w-0">
            {m.company_name || m.domain}
          </span>
          {m.hq_city && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline truncate max-w-[56px]">
              {m.hq_city}
            </span>
          )}
          <StagePill stage={m.lifecycle_stage} />
        </div>
      ))}
    </div>
  )
}

export function AccountIntelligence() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery<CorporateGroup[]>({
    queryKey: ['corporate-groups', ''],
    queryFn: () =>
      api.get('/corporate-groups')
        .then(r => (Array.isArray(r.data) ? r.data : (r.data?.results ?? [])) as CorporateGroup[]),
    staleTime: 60_000,
  })

  const groups = data ?? []

  return (
    <CardShell className="px-6 pt-6 pb-5 flex flex-col bg-slate-50 dark:bg-neutral-950">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Account Intelligence</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
        {isLoading
          ? <Skel className="inline-block h-3 w-52" />
          : `${groups.length} corporate group${groups.length !== 1 ? 's' : ''}`
        }
      </p>

      <div
        className="flex flex-col gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ maxHeight: '264px' }}
      >
        {/* Loading skeletons */}
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Skel key={i} className="h-16 w-full rounded-xl" />
        ))}

        {/* Corporate group cards */}
        {!isLoading && groups.map((g, i) => {
          const slot   = SLOTS[i % SLOTS.length]
          const isOpen = expanded === g.id
          const domain = g.root_domain ?? ''

          return (
            <div
              key={g.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 p-3"
            >
              {/* Header row — click to toggle members */}
              <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : g.id)}
              >
                <CompanyAvatar domain={domain} name={g.name} size="xxs" />
                <span className="flex-1 text-xs font-medium text-slate-800 dark:text-slate-200 truncate min-w-0">
                  {g.name}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-white tabular-nums shrink-0">
                  {g.member_count}
                </span>
                <span className="text-slate-300 dark:text-neutral-600 shrink-0">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </div>

              {/* Description — truncated, "see more" overlaps the ellipsis */}
              {g.description && (
                <div className="mt-0.5 ml-[34px]">
                  <DescriptionLink text={g.description} />
                </div>
              )}

              {/* Expanded members */}
              {isOpen && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-neutral-700 ml-[34px]">
                  <GroupMembers groupId={g.id} accentBar={slot.bar} />
                </div>
              )}
            </div>
          )
        })}

        {!isLoading && groups.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center italic">
            No corporate groups yet
          </p>
        )}
      </div>
    </CardShell>
  )
}
