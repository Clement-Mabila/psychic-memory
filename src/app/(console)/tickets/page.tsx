'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Cookies from 'js-cookie'

import { securityApi } from '@/lib/api'
import { TicketsHeader }   from '@/components/tickets/TicketsHeader'
import { TicketCardGrid }  from '@/components/tickets/TicketCardGrid'
import { TicketDetailPanel } from '@/components/tickets/TicketDetailPanel'
import type { TicketListItem } from '@/components/tickets/TicketCard'
import type { TicketDetail }   from '@/components/tickets/TicketDetailPanel'

// ── API helpers ───────────────────────────────────────────────────────────────

function authHeaders() {
  const token = Cookies.get('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchTicketList(): Promise<TicketListItem[]> {
  const { data } = await axios.get('/api/tickets/', {
    params:  { per_page: 100 },
    headers: authHeaders(),
  })
  return data.results ?? []
}

async function fetchTicketDetail(id: string): Promise<TicketDetail> {
  const { data } = await axios.get(`/api/tickets/${id}/`, { headers: authHeaders() })
  return data
}

// ── Client-side filtering ─────────────────────────────────────────────────────

function applyFilters(
  tickets:        TicketListItem[],
  statusFilter:   string,
  priorityFilter: string,
): TicketListItem[] {
  return tickets.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter === 'sla' && !t.sla_breached) return false
    if (priorityFilter && priorityFilter !== 'sla' && t.priority !== priorityFilter) return false
    return true
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const [statusFilter,   setStatusFilter]   = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [openTicket,     setOpenTicket]     = useState<TicketDetail | null>(null)

  // Current user — to determine isSuperAdmin
  const { data: me } = useQuery({
    queryKey: ['security-me'],
    queryFn:  securityApi.getMe,
    staleTime: 300_000,
  })
  const isSuperAdmin = me?.role === 'super_admin'

  // Ticket list — adaptive polling: faster when open/active tickets present
  const { data: allTickets = [], isLoading } = useQuery<TicketListItem[]>({
    queryKey: ['ticket-list'],
    queryFn:  fetchTicketList,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const list: TicketListItem[] = (query.state.data as TicketListItem[]) ?? []
      const hasActive = list.some(t => t.status === 'open' || t.status === 'auto_responded' || t.status === 'in_review')
      return hasActive ? 10_000 : 30_000
    },
  })

  // Full detail — only fetched when a card is clicked
  const { data: detailData, isFetching: detailLoading } = useQuery<TicketDetail>({
    queryKey: ['ticket-detail', selectedId],
    queryFn:  () => fetchTicketDetail(selectedId!),
    enabled:  !!selectedId,
    staleTime: 0,
  })

  useEffect(() => {
    if (detailData) setOpenTicket(detailData)
  }, [detailData])

  function handleCardClick(ticket: TicketListItem) {
    setSelectedId(ticket.id)
    setOpenTicket(null)  // clear previous panel while fetching
  }

  function handleClose() {
    setSelectedId(null)
    setOpenTicket(null)
  }

  function handleTicketUpdated(updated: TicketDetail) {
    setOpenTicket(updated)
  }

  const filtered = applyFilters(allTickets, statusFilter, priorityFilter)

  return (
    <>
      <div className="flex h-full min-h-0">

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          <TicketsHeader
            tickets={allTickets}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            onStatusFilter={setStatusFilter}
            onPriorityFilter={setPriorityFilter}
          />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <TicketCardGrid
              tickets={filtered}
              isLoading={isLoading}
              onSelect={handleCardClick}
            />
          </div>
        </div>

      </div>

      {/* ── Detail panel (rendered outside the flex to overlay) ── */}
      {openTicket && (
        <TicketDetailPanel
          ticket={openTicket}
          onClose={handleClose}
          isSuperAdmin={isSuperAdmin}
          onTicketUpdated={handleTicketUpdated}
        />
      )}

      {/* Loading indicator while fetching selected ticket detail */}
      {selectedId && !openTicket && detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 dark:bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl px-6 py-4">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Loading ticket…</span>
          </div>
        </div>
      )}
    </>
  )
}
