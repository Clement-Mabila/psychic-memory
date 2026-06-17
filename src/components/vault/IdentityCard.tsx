'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, Link, Users, Building2, Briefcase } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { vaultApi } from '@/lib/api'
import { fmtDate, formatPhone } from './shared/helpers'
import { TierBadge } from './shared/TierBadge'

interface IdentityCardProps {
  personId: string
  onBack:   () => void
}

export function IdentityCard({ personId, onBack }: IdentityCardProps) {
  const { data: p, isLoading } = useQuery({
    queryKey: ['vault-identity', personId],
    queryFn:  () => vaultApi.getIdentity(personId),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
        Loading identity…
      </p>
    )
  }
  if (!p) {
    return (
      <p className="text-sm text-red-500 text-center py-8">Identity not found</p>
    )
  }

  const signalSection = (
    type:  string,
    icon:  React.ElementType,
    label: string,
  ) => {
    const Icon  = icon
    const sigs: any[] = p.signals?.[type] ?? []
    if (!sigs.length) return null
    return (
      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
          <Icon size={12} />{label}
        </p>
        {sigs.map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="font-mono text-gray-700 dark:text-slate-300">{s.value}</span>
            {s.is_primary && <Badge variant="info">primary</Badge>}
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">
              seen {s.source_count}× · first {fmtDate(s.first_seen_at)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
      >
        <ArrowLeft size={14} /> All Identities
      </button>

      {/* Identity overview card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg flex-shrink-0">
            {p.canonical_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {p.canonical_name}
              </h2>
              {p.quality_tier && <TierBadge tier={p.quality_tier} />}
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{p.canonical_email}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-400 dark:text-slate-500">Appearances</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {p.total_appearances}
            </p>
          </div>
        </div>

        {/* Signal sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-gray-50 dark:border-slate-800 pt-4">
          {signalSection('email',        Mail,  'Emails')}
          {signalSection('phone',        Phone, 'Phones')}
          {signalSection('linkedin_url', Link,  'LinkedIn')}
          {signalSection('name',         Users, 'Name Variants')}
        </div>
      </div>

      {/* Company appearances */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 dark:border-slate-800">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Company Appearances
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            Every place this person has appeared in the pipeline
          </p>
        </div>

        {p.appearances?.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">
            No appearances recorded
          </p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {p.appearances?.map((app: any, i: number) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <div
                  className={cn(
                    'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                    app.is_active ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-slate-600',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200 flex items-center gap-1">
                      <Building2 size={12} className="text-gray-400" />
                      {app.company_name || (
                        <span className="text-gray-400 italic">Unknown company</span>
                      )}
                    </p>
                    {app.title && (
                      <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                        <Briefcase size={10} />{app.title}
                      </span>
                    )}
                    {app.buying_role && (
                      <Badge variant="neutral">{app.buying_role}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-slate-500 flex-wrap">
                    {app.email_snapshot && (
                      <span>
                        <Mail size={10} className="inline mr-0.5" />
                        {app.email_snapshot}
                      </span>
                    )}
                    {app.phone_snapshot && (
                      <span>
                        <Phone size={10} className="inline mr-0.5" />
                        {formatPhone(app.phone_snapshot)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {fmtDate(app.recorded_at)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                    {app.lead_contact_id.slice(0, 8)}…
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
