'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Play, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCountdown } from '@/lib/utils'
import api from '@/lib/api'

type Task = {
  id: number; name: string; task: string; enabled: boolean
  category: string; schedule: string; schedule_type: string
  crontab: { minute: string; hour: string; day_of_month: string; month_of_year: string; day_of_week: string } | null
  next_run_seconds: number | null; last_run_at: string | null; total_run_count: number
}

const CATEGORY_COLOURS: Record<string, string> = {
  'Signal Collectors': 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
  'Pipeline Agents':   'bg-purple-100 text-purple-700 dark:text-purple-400',
  'Apollo':            'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  'Maintenance':       'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
  'CRM Sync':          'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400',
  'Training':          'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400',
  'Knowledge Base':    'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
  'Other':             'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
}

function CountdownCell({ seconds }: { seconds: number | null }) {
  const [s, setS] = useState(seconds ?? 0)
  const ref = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    setS(seconds ?? 0)
    if (ref.current) clearInterval(ref.current)
    ref.current = setInterval(() => setS(p => Math.max(0, p - 1)), 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [seconds])

  if (seconds === null) return <span className="text-gray-300 dark:text-slate-600">—</span>
  return (
    <Badge variant={s < 300 ? 'warning' : 'neutral'} className="font-mono text-xs tabular-nums">
      {formatCountdown(s)}
    </Badge>
  )
}

export default function SchedulerPage() {
  const { data, refetch } = useQuery({
    queryKey: ['scheduler'],
    queryFn:  () => api.get('/scheduler/').then(r => r.data),
    refetchInterval: 30_000,
  })

  const toggleMutation  = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.patch(`/scheduler/${id}/`, { enabled }),
    onSuccess: () => refetch(),
  })

  const triggerMutation = useMutation({
    mutationFn: (id: number) => api.post(`/scheduler/${id}/trigger/`),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, crontab }: { id: number; crontab: object }) =>
      api.patch(`/scheduler/${id}/`, { crontab }),
    onSuccess: () => refetch(),
  })

  const tasks: Task[] = data?.tasks ?? []
  const categories   = [...new Set(tasks.map(t => t.category))]

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Scheduler</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {tasks.filter(t => t.enabled).length} active · {tasks.filter(t => !t.enabled).length} disabled
          </p>
        </div>
      </div>

      {categories.map(cat => {
        const catTasks = tasks.filter(t => t.category === cat)
        return (
          <Card key={cat} className="mb-5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className={CATEGORY_COLOURS[cat] ?? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}>{cat}</Badge>
                <span className="text-xs text-gray-400 dark:text-slate-500">{catTasks.length} task{catTasks.length !== 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                    <th className="w-12 px-4 py-2.5 text-center text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">On</th>
                    {['Task', 'Schedule', 'Next Run', 'Last Run', 'Runs', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catTasks.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={enabled => toggleMutation.mutate({ id: t.id, enabled })}
                      onTrigger={() => triggerMutation.mutate(t.id)}
                      onEditCron={crontab => editMutation.mutate({ id: t.id, crontab })}
                      triggering={triggerMutation.isPending && triggerMutation.variables === t.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function TaskRow({ task, onToggle, onTrigger, onEditCron, triggering }: {
  task: Task
  onToggle: (enabled: boolean) => void
  onTrigger: () => void
  onEditCron: (crontab: object) => void
  triggering: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [cron, setCron] = useState(task.crontab ?? { minute: '*', hour: '*', day_of_month: '*', month_of_year: '*', day_of_week: '*' })

  return (
    <tr className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-2.5 text-center">
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={task.enabled} onChange={e => onToggle(e.target.checked)} className="sr-only" />
          <div className={`w-8 h-4 rounded-full transition-colors ${task.enabled ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'bg-gray-200 dark:bg-slate-600'}`}>
            <div className={`w-3 h-3 bg-white dark:bg-slate-900 rounded-full shadow transition-all mt-0.5 ${task.enabled ? 'ml-4.5' : 'ml-0.5'}`} style={{ marginLeft: task.enabled ? '18px' : '2px' }} />
          </div>
        </label>
      </td>
      <td className="px-4 py-2.5">
        <p className="font-medium text-gray-700 dark:text-slate-300 text-xs">{task.name}</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 font-mono truncate max-w-[280px]">{task.task}</p>
      </td>
      <td className="px-4 py-2.5">
        {editing && task.crontab ? (
          <div className="flex gap-1 items-center">
            {['minute','hour','day_of_month','month_of_year','day_of_week'].map(f => (
              <input key={f} value={(cron as any)[f]} onChange={e => setCron(p => ({ ...p, [f]: e.target.value }))}
                title={f} className="w-10 h-6 border border-gray-200 dark:border-slate-700 rounded text-xs text-center font-mono outline-none focus:border-indigo-400 dark:focus:border-indigo-500" />
            ))}
            <Button size="sm" variant="primary" onClick={() => { onEditCron(cron); setEditing(false) }}>
              <Check size={11} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>✕</Button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="font-mono text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 px-2 py-1 rounded-md hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-600 transition-colors">
            {task.schedule}
          </button>
        )}
      </td>
      <td className="px-4 py-2.5"><CountdownCell seconds={task.enabled ? task.next_run_seconds : null} /></td>
      <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-slate-500">{task.last_run_at ? new Date(task.last_run_at).toLocaleString() : 'Never'}</td>
      <td className="px-4 py-2.5 text-xs text-right text-gray-500 dark:text-slate-400">{task.total_run_count.toLocaleString()}</td>
      <td className="px-4 py-2.5 text-right">
        <Button variant="ghost" size="sm" loading={triggering} onClick={onTrigger}>
          <Play size={11} /> Now
        </Button>
      </td>
    </tr>
  )
}
