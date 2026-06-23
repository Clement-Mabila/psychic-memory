'use client'

import { Loader2, Inbox } from 'lucide-react'
import { TicketCard, type TicketListItem } from './TicketCard'

interface TicketCardGridProps {
  tickets:   TicketListItem[]
  isLoading: boolean
  onSelect:  (ticket: TicketListItem) => void
}

export function TicketCardGrid({ tickets, isLoading, onSelect }: TicketCardGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400 dark:text-slate-500 gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading tickets…
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
        <Inbox size={20} strokeWidth={1.5} />
        <p className="text-sm">No tickets match your filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tickets.map(ticket => (
        <TicketCard key={ticket.id} ticket={ticket} onClick={onSelect} />
      ))}
    </div>
  )
}
