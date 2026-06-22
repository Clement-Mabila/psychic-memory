'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  MoreVertical, RefreshCw, ExternalLink,
  Loader2, X, Check, ShieldCheck, Mail,
} from 'lucide-react'
import api from '@/lib/api'
import { GenerateEmailModal } from './GenerateEmailModal'
import type { Contact, RowAction } from './types'

export function RowActions({
  contact,
  onResolved,
}: {
  contact: Contact
  onResolved: (id: string) => void
}) {
  const [open,           setOpen]           = useState(false)
  const [action,         setAction]         = useState<RowAction>('idle')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const poll = useCallback((endpoint: string, taskId: string, finalAction: RowAction = 'done') => {
    let attempts = 0
    const tick = async () => {
      try {
        const { data } = await api.get(endpoint.replace(':taskId', taskId))
        if (data.state === 'SUCCESS') { setAction(finalAction); onResolved(contact.id); return }
        if (data.state === 'FAILURE') { setAction('failed'); return }
      } catch { /* ignore */ }
      if (++attempts < 30) setTimeout(tick, 2000)
      else setAction('failed')
    }
    setTimeout(tick, 2000)
  }, [contact.id, onResolved])

  const dispatchFind = useMutation({
    mutationFn: () => api.post(`/contacts/${contact.id}/find-email`).then(r => r.data),
    onSuccess: ({ task_id }) => {
      setOpen(false)
      setAction('finding')
      poll(`/contacts/${contact.id}/find-email/status/:taskId`, task_id)
    },
    onError: () => setAction('failed'),
  })

  const dispatchVerify = useMutation({
    mutationFn: () => api.post(`/contacts/${contact.id}/verify-email`).then(r => r.data),
    onSuccess: ({ task_id }) => {
      setOpen(false)
      setAction('verifying')
      poll(`/contacts/${contact.id}/verify-email/status/:taskId`, task_id)
    },
    onError: () => setAction('failed'),
  })

  const isRunning = action === 'finding' || action === 'verifying'

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => !isRunning && setOpen(p => !p)}
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isRunning
            ? <Loader2 className="h-4 w-4 text-fuchsia-500 animate-spin" />
            : action === 'done'   ? <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            : action === 'failed' ? <X     className="h-4 w-4 text-red-400" />
            : <MoreVertical className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
        </button>

        {open && (
          <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-lg p-1">

            {contact.zb_verifiable && (
              <button
                onClick={() => dispatchVerify.mutate()}
                disabled={dispatchVerify.isPending}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <ShieldCheck className="h-3 w-3" />
                Verify with ZeroBounce
              </button>
            )}

            {contact.resolvable && (
              <button
                onClick={() => dispatchFind.mutate()}
                disabled={dispatchFind.isPending}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Find Real Email
              </button>
            )}

            {!contact.resolvable && contact.verified_with_zerobounce && contact.verification_tier !== 'verified' && (
              <button
                onClick={() => dispatchFind.mutate()}
                disabled={dispatchFind.isPending}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                ZB failed — try again
              </button>
            )}

            {contact.linkedin_url && (
              <>
                {(contact.zb_verifiable || contact.resolvable) && (
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                )}
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" /> View LinkedIn
                </a>
              </>
            )}

            {isRunning && (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-blue-500 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                {action === 'verifying' ? 'Verifying…' : 'Finding email…'}
              </div>
            )}
            {action === 'failed' && (
              <div className="px-2 py-2 text-xs text-red-500 dark:text-red-400">Failed — check logs</div>
            )}

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button
              onClick={() => { setOpen(false); setShowEmailModal(true) }}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            >
              <Mail className="h-3 w-3" />
              Generate Email
            </button>
          </div>
        )}
      </div>

      {showEmailModal && (
        <GenerateEmailModal
          contact={contact}
          onClose={() => setShowEmailModal(false)}
          onSaved={() => setShowEmailModal(false)}
        />
      )}
    </>
  )
}
