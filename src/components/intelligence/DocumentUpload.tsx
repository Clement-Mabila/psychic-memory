'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CRITIC_NAMES } from './constants'
import api from '@/lib/api'

interface Props {
  onUploaded: () => void
}

export function DocumentUpload({ onUploaded }: Props) {
  const [open, setOpen]     = useState(false)
  const [msg,  setMsg]      = useState<string | null>(null)
  const [form, setForm]     = useState({
    critic_id: '', source_name: '', vertical: '', raw_text: '',
  })

  const mutation = useMutation({
    mutationFn: () => api.post('/kb/documents', form),
    onSuccess: () => {
      setMsg('Uploaded — will compile on next hourly pass')
      setForm({ critic_id: '', source_name: '', vertical: '', raw_text: '' })
      onUploaded()
    },
    onError: (err: any) => {
      setMsg(`Error: ${err.response?.data?.error ?? err.message}`)
    },
  })

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-slate-900 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Upload size={13} className="text-slate-400 dark:text-slate-500" />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Upload Source Document</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">ICP briefs, playbooks, rubrics</span>
        </div>
        {open
          ? <ChevronUp size={14} className="text-slate-400 dark:text-slate-500" />
          : <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-neutral-800 p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 block mb-1">
                Critic *
              </label>
              <select
                value={form.critic_id}
                onChange={e => setForm(f => ({ ...f, critic_id: e.target.value }))}
                className="w-full h-8 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs px-2.5 outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="">Select…</option>
                {Object.entries(CRITIC_NAMES).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 block mb-1">
                Source name *
              </label>
              <input
                value={form.source_name}
                onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))}
                placeholder="Casino ICP brief v3"
                className="w-full h-8 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs px-2.5 outline-none focus:border-slate-400 dark:focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 block mb-1">
                Vertical
              </label>
              <input
                value={form.vertical}
                onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}
                placeholder="casino"
                className="w-full h-8 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs px-2.5 outline-none focus:border-slate-400 dark:focus:border-slate-500"
              />
            </div>
          </div>

          <textarea
            value={form.raw_text}
            onChange={e => setForm(f => ({ ...f, raw_text: e.target.value }))}
            rows={7}
            placeholder="Paste document content…"
            className="w-full border border-slate-200 dark:border-neutral-700 rounded-xl p-3 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none focus:border-slate-400 dark:focus:border-slate-500 resize-y"
          />

          <div className="flex items-center gap-3">
            <Button
              variant="primary" size="sm"
              loading={mutation.isPending}
              onClick={() => { setMsg(null); mutation.mutate() }}
            >
              <Upload size={12} /> Upload
            </Button>
            {msg && (
              <span className={cn(
                'text-xs px-3 py-1 rounded-full',
                msg.startsWith('Error') ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
              )}>
                {msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
