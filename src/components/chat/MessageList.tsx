'use client'
import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage } from '@/types/chat'

interface MessageListProps {
  messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!messages.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-700 dark:text-neutral-200">MBody Brain</p>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Ask me anything about your pipeline — leads, stats, or actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {STARTER_PROMPTS.map(p => (
            <span
              key={p}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 cursor-default"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

const STARTER_PROMPTS = [
  'Which lead should I run first?',
  'Show me all SQL leads',
  'Pipeline stats overview',
  'Generate a brief for Acme Corp',
]
