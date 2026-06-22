'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Mail, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useEmailGenerate } from './useEmailGenerate'
import { ThinkingPanel } from './ThinkingPanel'
import type { GeneratedEmailData } from './types'

// ── SVG card shape ─────────────────────────────────────────────────────────────

function buildEmailTabPath(tabRight: number): string {
  const ce = tabRight + 56
  return [
    `M 18 2 L ${tabRight} 2`,
    `C ${(tabRight + 35).toFixed(2)} 2 ${(tabRight + 21).toFixed(2)} 25.25 ${ce.toFixed(2)} 25.25`,
    `L 268 25.25 Q 286 25.25 286 50`,
    `L 286 192 Q 286 208 270 208 L 18 208 Q 2 208 2 192 L 2 18 Q 2 2 18 2 Z`,
  ].join(' ')
}

function EmailCardShape() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 288 210"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={buildEmailTabPath(100)}
        className="fill-zinc-200 dark:fill-zinc-800"
        stroke="transparent"
        strokeWidth="2"
      />
    </svg>
  )
}

// ── EmailCard ─────────────────────────────────────────────────────────────────

export function EmailCard({
  email,
  onSaved,
  onArchive: _onArchive,
}: {
  email: GeneratedEmailData
  onSaved: (updated: GeneratedEmailData) => void
  onArchive: (id: string) => void
}) {
  const qc                                  = useQueryClient()
  const gen                                 = useEmailGenerate(email.contact_id)
  const [saving,        setSaving]          = useState(false)
  const [emailExpanded, setEmailExpanded]   = useState(false)

  const dateStr = email.created
    ? new Date(email.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation()
    gen.start()
  }

  const handleSave = async () => {
    if (!gen.parsed.subject || !gen.parsed.body) return
    setSaving(true)
    try {
      const { data } = await api.post(`/contacts/${email.contact_id}/save-email`, {
        subject:    gen.parsed.subject,
        body:       gen.parsed.body,
        model_used: email.model_used,
      })
      qc.invalidateQueries({ queryKey: ['emails'] })
      onSaved(data)
      gen.reset()
    } catch { gen.setPhase('preview') }
    finally { setSaving(false) }
  }

  return (
    <div className="relative w-[280px] mb-3 flex-shrink-0">
      <EmailCardShape />
      <div className="relative z-10 px-4 pt-3 pb-4 flex flex-col" style={{ minHeight: 210 }}>

        {/* Status badge */}
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-3 text-emerald-600 dark:text-emerald-400">
          <Mail size={13} />
          Saved
        </div>

        {/* Company */}
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5 leading-snug truncate">
          {email.company_name}
        </h2>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 truncate">
          {email.contact_email || email.company_domain || '—'}
        </p>

        {/* To + date */}
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            <span className="text-slate-400">To: </span>
            {email.contact_name} · {email.contact_title}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{dateStr}</span>
        </div>

        {/* Regenerated preview */}
        {gen.phase === 'preview' ? (
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-xl px-3 py-2 mb-2">
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 truncate">
              {gen.parsed.subject}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
              {gen.parsed.body}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-6 text-[10px] font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => gen.start()}
                className="flex-1 h-6 text-[10px] font-medium bg-stone-200 dark:bg-stone-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        ) : (
          /* Saved email body — collapsible */
          <div className="w-full my-1 relative">
            <div className={cn(
              'w-full text-xs text-slate-500 bg-stone-100 dark:bg-stone-800 dark:text-slate-400 px-3 pt-1.5 pb-7 rounded-xl leading-relaxed',
              gen.phase === 'idle' && !emailExpanded ? 'max-h-[5rem] overflow-hidden' : '',
            )}>
              {(gen.phase === 'thinking' || gen.phase === 'content') ? (
                <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <span className="relative shrink-0 w-5 h-5">
                    <span className="absolute inset-0 rounded-full bg-blue-400/40 blur-sm animate-pulse scale-150" />
                    <img src="/Logo.svg" alt="" className="relative w-5 h-5" />
                  </span>
                  {gen.phase === 'thinking' ? 'Thinking…' : 'Writing…'}
                </span>
              ) : (
                <span className="font-semibold text-slate-700 dark:text-slate-300 block truncate mb-0.5">
                  {email.subject}
                </span>
              )}
              {gen.phase === 'idle' && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block whitespace-pre-wrap break-words">
                  {email.body}
                </span>
              )}
            </div>

            {gen.phase === 'idle' && !emailExpanded && email.body && (
              <div className="absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-stone-100 dark:from-stone-800 to-transparent rounded-b-xl pointer-events-none" />
            )}

            <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
              {gen.phase === 'idle' && email.body && (
                <button
                  onClick={e => { e.stopPropagation(); setEmailExpanded(x => !x) }}
                  title={emailExpanded ? 'Collapse' : 'Expand'}
                  className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                >
                  <ChevronDown
                    size={12}
                    className={cn('transition-transform duration-200', emailExpanded && 'rotate-180')}
                  />
                </button>
              )}
              <button
                onClick={handleRegenerate}
                disabled={gen.phase === 'thinking' || gen.phase === 'content'}
                title="Regenerate email"
                className="disabled:opacity-50 transition-opacity bg-stone-500 rounded-full p-0.5"
              >
                <span className="relative block w-5 h-5">
                  {(gen.phase === 'thinking' || gen.phase === 'content') && (
                    <span className="absolute inset-0 rounded-full bg-blue-400/40 blur-sm animate-pulse scale-150" />
                  )}
                  <img src="/Logo.svg" alt="" className="relative w-5 h-5 opacity-70 hover:opacity-100 transition-opacity" />
                </span>
              </button>
            </div>
          </div>
        )}

        <ThinkingPanel thinking={gen.thinking} phase={gen.phase} elapsed={gen.elapsed} />

        <div className="flex-1" />

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-neutral-800 pt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Mail size={13} />
            <span>{email.contact_email_count} email{email.contact_email_count !== 1 ? 's' : ''} available</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[100px]">
            {email.model_used || '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
