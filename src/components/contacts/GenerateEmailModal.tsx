'use client'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import api from '@/lib/api'
import { useEmailGenerate } from './useEmailGenerate'
import { ThinkingPanel } from './ThinkingPanel'
import type { Contact } from './types'

export function GenerateEmailModal({
  contact,
  onClose,
  onSaved,
}: {
  contact: Contact
  onClose: () => void
  onSaved: () => void
}) {
  const qc      = useQueryClient()
  const gen     = useEmailGenerate(contact.id)
  const [saving, setSaving] = useState(false)

  useEffect(() => { gen.start() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!gen.parsed.subject || !gen.parsed.body) return
    setSaving(true)
    try {
      await api.post(`/contacts/${contact.id}/save-email`, {
        subject:    gen.parsed.subject,
        body:       gen.parsed.body,
        model_used: 'mbody-critic-qwen3',
      })
      qc.invalidateQueries({ queryKey: ['emails'] })
      onSaved()
      onClose()
    } catch { gen.setPhase('preview') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-700 overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Generate Email</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              To: {contact.name} · {contact.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <ThinkingPanel thinking={gen.thinking} phase={gen.phase} elapsed={gen.elapsed} />

          {gen.phase === 'preview' && (
            <div className="bg-slate-50 dark:bg-neutral-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{gen.parsed.subject}</p>
              <div className="border-t border-slate-200 dark:border-neutral-700 my-2" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Body</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {gen.parsed.body}
              </p>
            </div>
          )}

          {gen.phase === 'idle' && (
            <p className="text-sm text-slate-400 text-center py-4">Generation failed. Try again.</p>
          )}

          {gen.phase === 'preview' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-9 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Email'}
              </button>
              <button
                onClick={() => gen.start()}
                disabled={saving}
                className="flex-1 h-9 text-sm font-medium bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-40"
              >
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
