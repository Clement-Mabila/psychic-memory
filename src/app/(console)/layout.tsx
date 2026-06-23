'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/layout/page-header'
import { isAuthenticated } from '@/lib/api'
import { AgentFocusProvider } from '@/lib/agent-focus-context'
import { AgentSelectionProvider } from '@/lib/agent-selection-context'
import { TicketAccountProvider } from '@/lib/ticket-account-context'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})


export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const isAiPage = pathname.startsWith('/ai')

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  return (
    <QueryClientProvider client={queryClient}>
      <AgentSelectionProvider>
      <AgentFocusProvider>
      <TicketAccountProvider>
        <div style={{
          display: 'flex',
          // AI page needs a hard 100vh so flex children can stretch to fill it.
          // Other pages use minHeight so long lists can scroll naturally.
          height:    isAiPage ? '100vh' : undefined,
          minHeight: isAiPage ? undefined : '100vh',
          overflow:  isAiPage ? 'hidden' : undefined,
        }}>
          <div style={{ width: 'var(--sidebar-w, 224px)', flexShrink: 0, transition: 'width 300ms ease-in-out' }} />
          <Sidebar />

          <div style={{
            flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
            // Explicit height so <main flex:1> below resolves to a definite size.
            height:   isAiPage ? '100vh' : undefined,
            overflow: isAiPage ? 'hidden' : undefined,
          }}>
            {!isAiPage && <PageHeader />}
            <main style={{ flex: 1, minHeight: 0, height: isAiPage ? '100%' : undefined, overflow: isAiPage ? 'hidden' : undefined }}>
              {children}
            </main>
          </div>
        </div>
      </TicketAccountProvider>
      </AgentFocusProvider>
      </AgentSelectionProvider>
    </QueryClientProvider>
  )
}
