'use client'

import { useQuery } from '@tanstack/react-query'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { vaultApi } from '@/lib/api'
import { recordTypeBadge } from '../shared/helpers'

export function OverviewTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vault-stats'],
    queryFn:  vaultApi.getStats,
    staleTime: 60_000,
  })

  const stat = (
    label:   string,
    value:   any,
    sub?:    string,
    accent?: string,
  ) => (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className={cn('text-2xl font-bold', accent ?? 'text-gray-900 dark:text-slate-100')}>
        {isLoading ? '—' : (value ?? 0)}
      </p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
    </div>
  )

  const byType: Record<string, number> = (data as any)?.by_type ?? {}

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">Encrypted archive health</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat('Total Archived',  (data as any)?.total_records,            'all time')}
        {stat('Active Records',  (data as any)?.active_records,           'not yet erased',  'text-indigo-600 dark:text-indigo-400')}
        {stat('Erased Records',  (data as any)?.erased_records,           'tombstoned',      'text-gray-500 dark:text-slate-500')}
        {stat(
          'Overdue Erasure',
          (data as any)?.overdue_erasure_requests,
          '>72h SLA',
          (data as any)?.overdue_erasure_requests > 0 ? 'text-red-600 dark:text-red-400' : undefined,
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Record Type</CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-500">encrypted snapshots in vault</span>
        </CardHeader>
        <CardBody>
          {Object.keys(byType).length === 0 && !isLoading && (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">Vault is empty</p>
          )}
          <div className="space-y-3">
            {Object.entries(byType).map(([type, count]) => {
              const pct = (data as any)?.total_records
                ? Math.round((count / (data as any).total_records) * 100)
                : 0
              return (
                <div key={type} className="flex items-center gap-3">
                  {recordTypeBadge(type)}
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 dark:bg-indigo-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 w-8 text-right">{pct}%</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 w-12 text-right">
                    {count.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {((data as any)?.pending_erasure_requests ?? 0) > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <AlertTriangle
            size={16}
            className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {(data as any).pending_erasure_requests} erasure request
              {(data as any).pending_erasure_requests !== 1 ? 's' : ''} awaiting action
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Switch to the Erasure Requests tab to review and process them within the 72-hour SLA.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
