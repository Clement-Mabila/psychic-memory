'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Building2, Users, Unlink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

interface GroupPickerModalProps {
  leadId: string
  currentGroup?: { id: string; name: string; root_domain?: string } | null
  onClose: () => void
  onSaved: () => void
}

export default function GroupPickerModal({ leadId, currentGroup, onClose, onSaved }: GroupPickerModalProps) {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading } = useQuery({
    queryKey: ['corporate-groups', debouncedQ],
    queryFn: () =>
      api.get('/corporate-groups', { params: { q: debouncedQ } }).then(r => r.data),
    staleTime: 60_000,
  })

  const groups: any[] = Array.isArray(data) ? data : (data?.results ?? [])

  const mutation = useMutation({
    mutationFn: (payload: { corporate_group_id: string | null }) =>
      api.post(`/leads/${leadId}/set_group/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['leads-kanban'] })
      onSaved()
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-indigo-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Set Corporate Group</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
            <X size={14} />
          </button>
        </div>

        {/* Current group pill */}
        {currentGroup && (
          <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center gap-2">
            <Building2 size={11} className="text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex-1 truncate">
              {currentGroup.name}
            </span>
            <button
              onClick={() => mutation.mutate({ corporate_group_id: null })}
              disabled={mutation.isPending}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              <Unlink size={10} /> Remove
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative px-3 py-2.5 border-b border-gray-100 dark:border-neutral-800">
          <Search size={12} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search groups…"
            className="w-full pl-6 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-neutral-700 rounded-lg outline-none focus:border-indigo-300 dark:focus:border-indigo-600 text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Group list */}
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-neutral-800/60">
          {isLoading && (
            <div className="py-8 text-center text-xs text-gray-400 dark:text-slate-500">Loading…</div>
          )}
          {!isLoading && groups.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-400 dark:text-slate-500">
              {debouncedQ ? `No groups matching "${debouncedQ}"` : 'No corporate groups yet'}
            </div>
          )}
          {groups.map((g: any) => {
            const isCurrent = currentGroup?.id === g.id
            return (
              <button
                key={g.id}
                disabled={mutation.isPending || isCurrent}
                onClick={() => mutation.mutate({ corporate_group_id: g.id })}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  isCurrent
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 cursor-default'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer'
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{g.name}</p>
                  {g.root_domain && (
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{g.root_domain}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500 flex-shrink-0">
                  <Users size={10} />
                  <span>{g.member_count ?? 0}</span>
                </div>
              </button>
            )
          })}
        </div>

        {mutation.isError && (
          <div className="px-4 py-2 text-xs text-red-500 border-t border-gray-100 dark:border-neutral-800">
            Failed to update group. Please try again.
          </div>
        )}
      </div>
    </div>
  )
}
