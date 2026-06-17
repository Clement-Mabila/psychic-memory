'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { FileText } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { ArticleCard }    from './ArticleCard'
import { DocumentUpload } from './DocumentUpload'
import { CRITIC_NAMES }   from './constants'
import api from '@/lib/api'

export function KnowledgeTab() {
  const [recompileMsgs, setRecompileMsgs] = useState<Record<number, string>>({})

  const { data: articlesData, refetch: refetchArticles } = useQuery({
    queryKey: ['kb-articles'],
    queryFn:  () => api.get('/kb/articles').then(r => r.data),
  })

  const { data: docsData, refetch: refetchDocs } = useQuery({
    queryKey: ['kb-documents'],
    queryFn:  () => api.get('/kb/documents').then(r => r.data),
  })

  const recompileMutation = useMutation({
    mutationFn: (id: number) => api.post(`/kb/articles/${id}/recompile`),
    onSuccess: (res, id) => {
      setRecompileMsgs(m => ({ ...m, [id]: `v${res.data.new_version} · ${res.data.source_verdict_count} verdicts` }))
      refetchArticles()
    },
    onError: (err: any, id) => {
      setRecompileMsgs(m => ({ ...m, [id]: `Error: ${err.response?.data?.error ?? err.message}` }))
    },
  })

  const articles = (articlesData?.articles ?? []) as any[]
  const docs     = (docsData?.documents    ?? []) as any[]

  return (
    <div className="space-y-5">

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Compiled by Claude from the verdict corpus · injected into every LLM critic prompt
      </p>

      <div className="grid grid-cols-2 gap-3">
        {articles.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))
          : articles.map((a: any) => (
              <ArticleCard
                key={a.id}
                article={a}
                onRecompile={() => recompileMutation.mutate(a.id)}
                recompiling={recompileMutation.isPending}
                msg={recompileMsgs[a.id]}
              />
            ))}
      </div>

      <DocumentUpload onUploaded={refetchDocs} />

      {docs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Uploaded Documents
            </span>
          </div>
          {docs.map((d: any) => (
            <div
              key={d.id}
              className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 dark:border-neutral-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <FileText size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">{d.source_name}</span>
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                d.processed ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400',
              )}>
                {d.processed ? 'Compiled' : 'Pending'}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {CRITIC_NAMES[d.critic_id] ?? d.critic_id}
                {d.vertical ? ` / ${d.vertical}` : ''}
              </span>
              <span className="text-[11px] text-slate-300 dark:text-slate-600">{formatRelativeTime(d.created_at)}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
