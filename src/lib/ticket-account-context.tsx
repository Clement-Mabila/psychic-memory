'use client'

import { createContext, useContext, useState } from 'react'

export interface TicketAccountFocus {
  domain:        string
  label:         string
  recentTickets: { id: string; subject: string; created_at: string }[]
}

interface TicketAccountContextValue {
  ticketFocus:    TicketAccountFocus | null
  setTicketFocus: (focus: TicketAccountFocus | null) => void
}

const TicketAccountContext = createContext<TicketAccountContextValue>({
  ticketFocus:    null,
  setTicketFocus: () => {},
})

export function TicketAccountProvider({ children }: { children: React.ReactNode }) {
  const [ticketFocus, setTicketFocus] = useState<TicketAccountFocus | null>(null)
  return (
    <TicketAccountContext.Provider value={{ ticketFocus, setTicketFocus }}>
      {children}
    </TicketAccountContext.Provider>
  )
}

export const useTicketAccountFocus = () => useContext(TicketAccountContext)
