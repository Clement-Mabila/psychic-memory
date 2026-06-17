'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { vaultApi } from '@/lib/api'
import { recordTypeBadge } from '../shared/helpers'

export function RetentionTab() {
  const qc = useQueryClient()
  const [editing,    setEditing]    = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vault-retention'],
    queryFn:  vaultApi.getRetentionPolicies,
    staleTime: 60_000,
  })

  const updateMut = useMutation({
    mutationFn: ({ record_type, body }: { record_type: string; body: any }) =>
      vaultApi.updateRetentionPolicy(record_type, body),
    onSuccess: () => {
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['vault-retention'] })
    },
  })

  const policies: any[] = (data as any)?.results ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Per-record-type retention rules (GDPR / PIPEDA / CASL)
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">Loading…</p>
      )}

      {policies.map(p => (
        <Card key={p.record_type}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {recordTypeBadge(p.record_type)}
              <CardTitle>{p.record_type}</CardTitle>
              {p.legal_hold && <Badge variant="danger">Legal Hold</Badge>}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (editing === p.record_type) {
                  setEditing(null)
                } else {
                  setEditing(p.record_type)
                  setEditValues({
                    retain_days:           p.retain_days,
                    auto_erase_after_days: p.auto_erase_after_days ?? '',
                    legal_hold:            p.legal_hold,
                    regulation_basis:      p.regulation_basis,
                  })
                }
              }}
            >
              {editing === p.record_type ? 'Cancel' : 'Edit'}
            </Button>
          </CardHeader>

          <CardBody>
            {editing === p.record_type ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    Retain Days
                  </label>
                  <input
                    type="number"
                    value={editValues.retain_days}
                    onChange={e =>
                      setEditValues((v: any) => ({ ...v, retain_days: +e.target.value }))
                    }
                    className="w-full h-9 px-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-gray-700 dark:text-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    Auto-erase After Days
                  </label>
                  <input
                    type="number"
                    placeholder="null = manual only"
                    value={editValues.auto_erase_after_days}
                    onChange={e =>
                      setEditValues((v: any) => ({
                        ...v,
                        auto_erase_after_days:
                          e.target.value === '' ? null : +e.target.value,
                      }))
                    }
                    className="w-full h-9 px-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-gray-700 dark:text-slate-300"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    Regulation Basis
                  </label>
                  <input
                    type="text"
                    value={editValues.regulation_basis}
                    onChange={e =>
                      setEditValues((v: any) => ({ ...v, regulation_basis: e.target.value }))
                    }
                    className="w-full h-9 px-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-gray-700 dark:text-slate-300"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`lh-${p.record_type}`}
                    checked={editValues.legal_hold}
                    onChange={e =>
                      setEditValues((v: any) => ({ ...v, legal_hold: e.target.checked }))
                    }
                    className="cursor-pointer"
                  />
                  <label
                    htmlFor={`lh-${p.record_type}`}
                    className="text-xs text-gray-600 dark:text-slate-300"
                  >
                    Legal Hold (blocks all erasure)
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={updateMut.isPending}
                    onClick={() =>
                      updateMut.mutate({ record_type: p.record_type, body: editValues })
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Retain</p>
                  <p className="font-medium text-gray-700 dark:text-slate-300">
                    {p.retain_days === 0 ? 'Indefinite' : `${p.retain_days} days`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Auto-erase</p>
                  <p className="font-medium text-gray-700 dark:text-slate-300">
                    {p.auto_erase_after_days ? `${p.auto_erase_after_days}d` : 'Manual only'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Dual Approval</p>
                  <p className="font-medium text-gray-700 dark:text-slate-300">
                    {p.require_dual_approval_for_purge ? 'Required' : 'Not required'}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Regulation Basis</p>
                  <p className="text-xs text-gray-600 dark:text-slate-300">
                    {p.regulation_basis || '—'}
                  </p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
