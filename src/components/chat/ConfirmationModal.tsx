'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/lib/chatApi'
import type { PendingAction } from '@/types/chat'

interface ConfirmationModalProps {
  action: PendingAction
  onSuccess: (result: unknown) => void
  onDismiss: () => void
}

export function ConfirmationModal({ action, onSuccess, onDismiss }: ConfirmationModalProps) {
  const [typed, setTyped]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const matches = typed.trim().toLowerCase() === action.required_text.trim().toLowerCase()

  async function handleConfirm() {
    if (!matches || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await confirmAction(action.action_id, typed)
      onSuccess(result)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && matches) handleConfirm()
    if (e.key === 'Escape') onDismiss()
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onDismiss() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-150" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl',
            'p-6 focus:outline-none animate-in zoom-in-95 duration-150',
          )}
          onEscapeKeyDown={onDismiss}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <Dialog.Title className="font-semibold text-slate-900 dark:text-neutral-50">
                  Confirm Action
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  {ACTION_TYPE_LABELS[action.action_type] ?? action.action_type}
                </Dialog.Description>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-700 dark:text-neutral-200 mb-4 leading-relaxed">
            {action.description}
          </p>

          {/* Type-to-confirm */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5">
              Type <span className="font-mono font-bold text-slate-800 dark:text-neutral-100 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{action.required_text}</span> to confirm
            </label>
            <input
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={action.required_text}
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm font-mono',
                'bg-white dark:bg-neutral-800',
                'focus:outline-none focus:ring-2',
                matches
                  ? 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-200 dark:focus:ring-emerald-800'
                  : 'border-slate-200 dark:border-neutral-700 focus:ring-blue-200 dark:focus:ring-blue-800',
                'transition-colors',
              )}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mb-3 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onDismiss}
              className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!matches || loading}
              className={cn(
                'px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 transition-colors',
                matches && !loading
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 cursor-not-allowed',
              )}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Confirm
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  trigger_lead_run:  'Run pipeline',
  update_lead_stage: 'Update lead stage',
}
