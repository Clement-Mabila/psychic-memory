'use client'

import { createContext, useContext, useState } from 'react'

export interface FocusedAgent {
  agent_type: string
  display_name: string
  recent_leads: { company_name: string; lead_id?: string }[]
}

interface AgentFocusContextValue {
  focusedAgent: FocusedAgent | null
  setFocusedAgent: (agent: FocusedAgent | null) => void
}

const AgentFocusContext = createContext<AgentFocusContextValue>({
  focusedAgent: null,
  setFocusedAgent: () => {},
})

export function AgentFocusProvider({ children }: { children: React.ReactNode }) {
  const [focusedAgent, setFocusedAgent] = useState<FocusedAgent | null>(null)
  return (
    <AgentFocusContext.Provider value={{ focusedAgent, setFocusedAgent }}>
      {children}
    </AgentFocusContext.Provider>
  )
}

export const useAgentFocus = () => useContext(AgentFocusContext)
