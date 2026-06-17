'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Boxes, RefreshCw, Info, ChevronsUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CRITIC_NAMES } from './constants'
import api from '@/lib/api'

interface Props {
  hasRunningJob: boolean
}

export function TriggerPanel({ hasRunningJob }: Props) {
  const qc = useQueryClient()
  const [triggerCritic, setTriggerCritic] = useState('')
  const [forceRun,      setForceRun]      = useState(false)
  const [msg,           setMsg]           = useState<string | null>(null)
  const [tooltip,       setTooltip]       = useState(false)
  const [exporting,     setExporting]     = useState(false)

  const handleExport = async () => {
    setExporting(true)
    setMsg(null)
    try {
      const res = await api.get('/training/export', {
        params: { ...(triggerCritic && { critic_id: triggerCritic }) },
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      const disposition = res.headers['content-disposition'] ?? ''
      const filename = disposition.match(/filename="(.+?)"/)?.[1] ?? 'training_data.jsonl'
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      const count = res.headers['x-example-count']
      setMsg(`Exported ${count ? `${count} examples` : 'training data'}`)
    } catch (err: any) {
      setMsg(`Error: ${err.response?.data?.error ?? err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const mutation = useMutation({
    mutationFn: () => api.post('/training/trigger', { force: forceRun, critic_id: triggerCritic }),
    onSuccess: (res) => {
      setMsg(`Queued · ${res.data.critic_id} · task ${res.data.task_id.slice(0, 8)}…`)
      qc.invalidateQueries({ queryKey: ['training-jobs'] })
    },
    onError: (err: any) => {
      setMsg(`Error: ${err.response?.data?.error ?? err.message}`)
    },
  })

  return (
    <div className="bg-stone-100 dark:bg-neutral-800 rounded-2xl border border-none shadow-sm dark:shadow-none p-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-stone-50 dark:bg-neutral-800 text-stone-500 dark:text-slate-400 flex items-center justify-center flex-shrink-0">
          <Boxes size={20} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-tight">
            Start Agent fine-tuning using Ollama
          </h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight mt-0.5">
            Manually dispatch a training job · scope to one critic or all
          </p>
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-neutral-800 mb-4" />

      {/* Running warning */}
      {hasRunningJob && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-sm text-blue-600 dark:text-blue-400">
          <RefreshCw size={12} className="animate-spin flex-shrink-0" />
          A training job is already running — enable force to override
        </div>
      )}

      {/* Row 1 — Bypass cooldown checkbox + info */}
      <div className="flex items-center gap-2 mb-3">
        <label className="flex items-center gap-2 pl-2 mb-1 text-xs text-gray-600 dark:text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={forceRun}
            onChange={e => setForceRun(e.target.checked)}
            className="cursor-pointer"
          />
          Aware of cooldown · force run anyway
        </label>

        {/* Info icon with tooltip */}
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setTooltip(true)}
            onMouseLeave={() => setTooltip(false)}
            className="w-4 h-4 rounded-full bg-gray-200 dark:bg-neutral-600 text-gray-500 dark:text-slate-400 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            <Info size={10} />
          </button>
          {tooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 leading-relaxed z-50 shadow-lg">
              The 2-day cooldown prevents back-to-back fine-tune runs on the same data.
              Bypass only when significant new verdicts have been collected since the last run.
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — Scope dropdown + Build button + feedback */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={triggerCritic}
          onChange={e => setTriggerCritic(e.target.value)}
          className="h-9 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs px-3 outline-none focus:border-gray-400 dark:focus:border-slate-500 bg-white dark:bg-neutral-900 text-gray-700 dark:text-slate-300"
        >
          <option value="">All critics</option>
          {Object.entries(CRITIC_NAMES).map(([id, name]) => (
            <option key={id} value={id}>{name} only</option>
          ))}
        </select>

        <Button
          variant="primary" size="sm"
          loading={mutation.isPending}
          onClick={() => { setMsg(null); mutation.mutate() }}
        >
          <ChevronsUp size={16} /> Build Model
        </Button>

        <Button
          variant="secondary" size="sm"
          loading={exporting}
          onClick={handleExport}
        >
          <Download size={14} /> Export JSONL
        </Button>

        {msg && (
          <span className={cn(
            'text-xs px-3 py-1.5 rounded-full',
            msg.startsWith('Error') ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
          )}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
