'use client'
import { useEffect, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/useChat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ConfirmationModal } from './ConfirmationModal'

interface ChatPanelProps {
  open: boolean
  onClose: () => void
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const {
    messages,
    streaming,
    pendingAction,
    sendMessage,
    clearMessages,
    dismissAction,
    abort,
  } = useChat()

  // ⌘K closes the panel
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
    }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleSuccess = useCallback((result: unknown) => {
    dismissAction()
    // Inject a brief confirmation message into the thread
    void sendMessage(`Action completed. ${typeof result === 'object' && result !== null ? (result as { result?: { message?: string } })?.result?.message ?? '' : ''}`)
  }, [dismissAction, sendMessage])

  return (
    <>
      <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose() }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
          <Dialog.Content
            className={cn(
              'fixed right-0 top-0 bottom-0 z-40',
              'w-full max-w-sm',
              'bg-white dark:bg-neutral-900',
              'border-l border-slate-100 dark:border-neutral-800',
              'flex flex-col shadow-2xl',
              'focus:outline-none',
              'animate-in slide-in-from-right duration-200',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
                  </svg>
                </div>
                <Dialog.Title className="text-sm font-semibold text-slate-800 dark:text-neutral-100">
                  MBody Brain
                </Dialog.Title>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    title="New conversation"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
                <Dialog.Close asChild>
                  <button
                    title="Close (⌘K)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Messages */}
            <MessageList messages={messages} />

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              onAbort={abort}
              streaming={streaming}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Confirmation modal — rendered outside the panel so z-index is correct */}
      {pendingAction && (
        <ConfirmationModal
          action={pendingAction}
          onSuccess={handleSuccess}
          onDismiss={dismissAction}
        />
      )}
    </>
  )
}
