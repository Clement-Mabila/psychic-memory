'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { vaultApi } from '@/lib/api'
import { statusBadge, fmtDatetime } from '../shared/helpers'

export function ErasureTab() {
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState('')
  const [showForm,     setShowForm]     = useState(false)
  const [form, setForm] = useState({
    requester_email: '',
    regulation:      'GDPR',
    notes:           '',
  })
  const [rejectId,      setRejectId]      = useState<string | null>(null)
  const [rejectReason,  setRejectReason]  = useState('')
  const [stepUpToken,   setStepUpToken]   = useState('')
  const [completingId,  setCompletingId]  = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vault-erasure', statusFilter],
    queryFn:  () => vaultApi.getErasureRequests({ status: statusFilter || undefined }),
    staleTime: 30_000,
  })

  const submitMut = useMutation({
    mutationFn: () => vaultApi.submitErasureRequest(form),
    onSuccess: () => {
      setShowForm(false)
      setForm({ requester_email: '', regulation: 'GDPR', notes: '' })
      qc.invalidateQueries({ queryKey: ['vault-erasure'] })
    },
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => vaultApi.approveErasureRequest(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['vault-erasure'] }),
  })

  const completeMut = useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) =>
      vaultApi.completeErasureRequest(id, token),
    onSuccess: () => {
      setCompletingId(null)
      setStepUpToken('')
      qc.invalidateQueries({ queryKey: ['vault-erasure'] })
    },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      vaultApi.rejectErasureRequest(id, reason),
    onSuccess: () => {
      setRejectId(null)
      setRejectReason('')
      qc.invalidateQueries({ queryKey: ['vault-erasure'] })
    },
  })

  const requests: any[] = (data as any)?.results ?? []

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 outline-none"
        >
          <option value="">All statuses</option>
          {['pending', 'approved', 'processing', 'completed', 'rejected'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw size={13} /> Refresh
        </Button>
        <Button variant="primary" size="sm" onClick={() => setShowForm(p => !p)}>
          {showForm ? 'Cancel' : '+ Submit Request'}
        </Button>
      </div>

      {/* New request form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Erasure Request</CardTitle></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  Subject Email *
                </label>
                <input
                  type="email"
                  value={form.requester_email}
                  onChange={e => setForm(f => ({ ...f, requester_email: e.target.value }))}
                  placeholder="person@example.com"
                  className="w-full h-9 px-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  Regulation
                </label>
                <select
                  value={form.regulation}
                  onChange={e => setForm(f => ({ ...f, regulation: e.target.value }))}
                  className="w-full h-9 px-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 outline-none"
                >
                  {['GDPR', 'CASL', 'PIPEDA', 'CCPA', 'manual'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional context…"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="primary"
                loading={submitMut.isPending}
                onClick={() => submitMut.mutate()}
                disabled={!form.requester_email}
              >
                Submit Request
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Request list */}
      <div className="space-y-3">
        {isLoading && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">Loading…</p>
        )}
        {!isLoading && requests.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
            No erasure requests
          </p>
        )}

        {requests.map((er: any) => (
          <div
            key={er.id}
            className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 space-y-3"
          >
            {/* Row */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                    {er.requester_email}
                  </p>
                  <Badge variant="neutral">{er.regulation}</Badge>
                  {statusBadge(er.status)}
                  {er.is_overdue && <Badge variant="danger">OVERDUE</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-slate-500 flex-wrap">
                  <span>{er.records_affected} record{er.records_affected !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>SLA: {fmtDatetime(er.sla_deadline)}</span>
                  {er.hours_remaining > 0 &&
                    er.status !== 'completed' &&
                    er.status !== 'rejected' && (
                      <>
                        <span>·</span>
                        <span className={er.is_overdue ? 'text-red-500 dark:text-red-400' : ''}>
                          {er.hours_remaining.toFixed(1)}h remaining
                        </span>
                      </>
                    )}
                  {er.requested_by && <span>· by {er.requested_by}</span>}
                </div>
                {er.notes && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 italic">{er.notes}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {er.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={approveMut.isPending}
                    onClick={() => approveMut.mutate(er.id)}
                  >
                    <CheckCircle size={13} /> Approve
                  </Button>
                )}
                {er.status === 'approved' && completingId !== er.id && (
                  <Button size="sm" variant="primary" onClick={() => setCompletingId(er.id)}>
                    Execute
                  </Button>
                )}
                {(er.status === 'pending' || er.status === 'approved') &&
                  rejectId !== er.id && (
                    <Button size="sm" variant="danger" onClick={() => setRejectId(er.id)}>
                      <XCircle size={13} /> Reject
                    </Button>
                  )}
              </div>
            </div>

            {/* Step-up confirm */}
            {completingId === er.id && (
              <div className="flex items-center gap-2 border-t border-gray-100 dark:border-slate-800 pt-3">
                <AlertTriangle size={14} className="text-red-500 dark:text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400 flex-shrink-0">Irreversible.</p>
                <input
                  type="text"
                  placeholder="Paste Step-Up token…"
                  value={stepUpToken}
                  onChange={e => setStepUpToken(e.target.value)}
                  className="flex-1 h-8 px-2.5 text-xs bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg text-gray-700 dark:text-slate-300 outline-none"
                />
                <Button
                  size="sm"
                  variant="danger"
                  loading={completeMut.isPending}
                  disabled={!stepUpToken}
                  onClick={() => completeMut.mutate({ id: er.id, token: stepUpToken })}
                >
                  Confirm Erase
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setCompletingId(null); setStepUpToken('') }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Reject confirm */}
            {rejectId === er.id && (
              <div className="flex items-center gap-2 border-t border-gray-100 dark:border-slate-800 pt-3">
                <input
                  type="text"
                  placeholder="Rejection reason (required)…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="flex-1 h-8 px-2.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 outline-none"
                />
                <Button
                  size="sm"
                  variant="danger"
                  loading={rejectMut.isPending}
                  disabled={!rejectReason}
                  onClick={() => rejectMut.mutate({ id: er.id, reason: rejectReason })}
                >
                  Confirm Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setRejectId(null); setRejectReason('') }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
