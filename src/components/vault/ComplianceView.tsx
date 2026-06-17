'use client'

import { useState } from 'react'
import { ChevronLeft, BarChart3, Archive, Trash2, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OverviewTab }   from './compliance/OverviewTab'
import { RecordsTab }    from './compliance/RecordsTab'
import { ErasureTab }    from './compliance/ErasureTab'
import { RetentionTab }  from './compliance/RetentionTab'

type ComplianceTabId = 'overview' | 'records' | 'erasure' | 'retention'

const COMPLIANCE_TABS = [
  { id: 'overview'  as const, label: 'Overview',           icon: BarChart3 },
  { id: 'records'   as const, label: 'Archived Records',   icon: Archive   },
  { id: 'erasure'   as const, label: 'Erasure Requests',   icon: Trash2    },
  { id: 'retention' as const, label: 'Retention Policies', icon: Settings2 },
]

interface ComplianceViewProps {
  onBack: () => void
}

export function ComplianceView({ onBack }: ComplianceViewProps) {
  const [tab, setTab] = useState<ComplianceTabId>('overview')

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to vault
      </button>

      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          Security &amp; Compliance
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Archived records · GDPR erasure requests · Retention policies
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex gap-1">
        {COMPLIANCE_TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-blue-500 text-blue-600 dark:text-white font-medium'
                  : 'border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white',
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview'  && <OverviewTab />}
        {tab === 'records'   && <RecordsTab />}
        {tab === 'erasure'   && <ErasureTab />}
        {tab === 'retention' && <RetentionTab />}
      </div>
    </div>
  )
}
