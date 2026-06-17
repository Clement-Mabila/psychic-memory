'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime } from '@/lib/utils'
import { CRITIC_NAMES } from './constants'

interface Props {
  article:     any
  onRecompile: () => void
  recompiling: boolean
  msg?:        string
}

export function ArticleCard({ article, onRecompile, recompiling, msg }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-neutral-700 px-4 py-3.5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {CRITIC_NAMES[article.critic_id] ?? article.critic_id}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium">
            v{article.version}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {article.vertical === 'general' ? 'all verticals' : article.vertical}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0">
          {article.source_verdict_count} verdicts · {formatRelativeTime(article.last_compiled_at)}
        </span>
      </div>

      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <pre className={cn(
          'text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 whitespace-pre-wrap overflow-hidden transition-all',
          expanded ? 'max-h-40 overflow-y-auto' : 'max-h-10',
        )}>
          {article.content_preview}
        </pre>
      </button>

      <div className="flex items-center gap-2 mt-2.5">
        <Button size="sm" variant="secondary" loading={recompiling} onClick={onRecompile}>
          <RefreshCw size={11} /> Recompile
        </Button>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
        {msg && (
          <span className={cn(
            'ml-auto text-[10px] px-2 py-0.5 rounded-full',
            msg.startsWith('Error') ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
          )}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
