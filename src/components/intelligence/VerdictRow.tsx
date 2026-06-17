'use client'

import { useState } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { CRITIC_NAMES } from './constants'

interface Props {
  verdict: any
}

export function VerdictRow({ verdict }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        className={cn(
          'border-b border-slate-50 dark:border-neutral-800 cursor-pointer transition-colors',
          expanded ? 'bg-slate-50 dark:bg-neutral-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
        )}
      >
        <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300 text-xs">
          {CRITIC_NAMES[verdict.critic_id] ?? verdict.critic_id}
        </td>
        <td className="px-5 py-3 font-mono text-slate-400 dark:text-slate-500 text-[10px]">
          {verdict.lead_id.slice(0, 8)}…
        </td>
        <td className="px-5 py-3">
          <span className={cn(
            'text-xs font-semibold',
            verdict.score >= 70 ? 'text-emerald-600 dark:text-emerald-400'
              : verdict.score >= 40 ? 'text-amber-500 dark:text-amber-400'
              : 'text-red-500 dark:text-red-400',
          )}>
            {verdict.score}
          </span>
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-1">
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              verdict.approved ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400',
            )}>
              {verdict.approved ? 'Approved' : 'Rejected'}
            </span>
            {verdict.was_overridden && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400">
                Overridden
              </span>
            )}
          </div>
        </td>
        <td className="px-5 py-3">
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-medium',
            verdict.source === 'llm' ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-500 dark:text-violet-400' : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400',
          )}>
            {verdict.source === 'llm'
              ? `LLM${verdict.confidence != null ? ` ${(verdict.confidence * 100).toFixed(0)}%` : ''}`
              : 'Claude'}
          </span>
        </td>
        <td className="px-5 py-3 text-center">
          {verdict.training_eligible
            ? <span className="text-emerald-500 dark:text-emerald-400 text-sm">✓</span>
            : <span className="text-slate-200 text-sm">–</span>}
        </td>
        <td className="px-5 py-3 max-w-[180px]">
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">{verdict.feedback}</span>
        </td>
        <td className="px-5 py-3 text-[10px] text-slate-400 dark:text-slate-500">
          {formatRelativeTime(verdict.created_at)}
        </td>
      </tr>

      {expanded && verdict.feedback && (
        <tr className="bg-slate-50 dark:bg-neutral-800 border-b border-slate-100 dark:border-neutral-800">
          <td colSpan={8} className="px-6 py-3">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
              {verdict.feedback}
            </p>
          </td>
        </tr>
      )}
    </>
  )
}
