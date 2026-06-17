'use client'

import { createContext, useContext, useState } from 'react'

type Ctx = { activeAgent: string; setActiveAgent: (a: string) => void }

const AgentSelectionContext = createContext<Ctx>({
  activeAgent: 'research',
  setActiveAgent: () => {},
})

export function AgentSelectionProvider({ children }: { children: React.ReactNode }) {
  const [activeAgent, setActiveAgent] = useState('research')
  return (
    <AgentSelectionContext.Provider value={{ activeAgent, setActiveAgent }}>
      {children}
    </AgentSelectionContext.Provider>
  )
}

export const useAgentSelection = () => useContext(AgentSelectionContext)
