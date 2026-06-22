'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail } from 'lucide-react'
import api from '@/lib/api'
import { EmailCard } from './EmailCard'
import type { EmailsResponse, FiltersState } from './types'

export function EmailsView({ filters }: { filters: FiltersState }) {
  const qc     = useQueryClient()
  const params = {
    company: filters.company || undefined,
    domain:  filters.domain  || undefined,
  }

  const { data, isLoading } = useQuery<EmailsResponse>({
    queryKey: ['emails', params],
    queryFn:  () => api.get('/emails', { params }).then(r => r.data),
    staleTime: 15_000,
  })

  const emails = data?.emails ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 text-slate-300 dark:text-neutral-600 animate-spin" />
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="p-16 text-center rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-3">
          <Mail className="w-8 h-8 text-white -rotate-3" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">No emails yet</h3>
        <p className="text-slate-400 dark:text-slate-500 text-sm">
          Go to the Table view, click ··· on a contact, and choose Generate Email.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-4 pt-2">
      {emails.map(email => (
        <EmailCard
          key={email.id}
          email={email}
          onSaved={() => qc.invalidateQueries({ queryKey: ['emails'] })}
          onArchive={async (id) => {
            await api.delete(`/contacts/${email.contact_id}/emails/${id}`)
            qc.invalidateQueries({ queryKey: ['emails'] })
          }}
        />
      ))}
    </div>
  )
}
